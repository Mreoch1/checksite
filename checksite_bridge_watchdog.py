#!/usr/bin/env python3
"""checksite_bridge_watchdog.py

Watch checksite's project-prefixed bridge files and wake the reader window.

This is the small, project-local version of the FORGE watcher. It does not
decide work or edit channel files. It only observes writes and types
"check bridge" into the addressee's window so Hermes / Cowork / Codex notice
their inbox changed.
"""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import logging
import sys
import time
from pathlib import Path

try:
    import winsound
except ImportError:
    winsound = None

try:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers.polling import PollingObserver as Observer
except ImportError:
    sys.exit("Missing 'watchdog'. Install with: pip install watchdog")

try:
    import pyautogui
    import pygetwindow as gw
except ImportError:
    sys.exit("Missing pyautogui/pygetwindow. Install with: pip install pyautogui pygetwindow")

try:
    import pyperclip
except ImportError:
    pyperclip = None


USER32 = ctypes.windll.user32
KERNEL32 = ctypes.windll.kernel32
SW_RESTORE = 9
VK_MENU = 0x12
KEYEVENTF_KEYUP = 0x02

ROOT = Path(__file__).resolve().parent
CHANNELS = ROOT / "channels"
LOG_PATH = ROOT / "checksite_bridge_watchdog.log"
PAUSE_FILE = ROOT / ".checksite_watcher_pause"
HEARTBEAT_PATH = ROOT / ".checksite_watcher_heartbeat"
LAST_SENT_PATH = ROOT / ".checksite_watcher_last_sent.json"

DEBOUNCE_SECONDS = 8
TARGET_COOLDOWN_SECONDS = 60
WATCHER_HEARTBEAT_SECONDS = 30
IDLE_CHECK_SECONDS = 120
MOMENTUM_SWEEP_SECONDS = 180
DEFAULT_WAKE_MESSAGE = "check bridge"
PRE_INJECT_PING = True
PING_FREQ_HZ = 330
PING_DURATION_MS = 45
PING_LEAD_SECONDS = 2
INPUT_CLICK_ENABLED = True

INPUT_CLICK_RULES = {
    "Cowork": (0.38, 0.93),
    "Codex": (0.55, 0.94),
    "Hermes": (0.50, 0.90),
}

COWORK_POPUP_DISMISS_RULE = (0.50, 0.70)

COWORK_WINDOW_HINTS = ["Claude", "Cowork", "Anthropic"]
HERMES_WINDOW_HINTS = ["Hermes"]
CODEX_WINDOW_HINTS = ["Codex", "GPT", "OpenAI"]

ROUTING = {
    ROOT / "seochecksiteToDo.txt": ("Cowork", COWORK_WINDOW_HINTS),
    ROOT / "URGENT_FOR_COWORK.md": ("Cowork", COWORK_WINDOW_HINTS),
    ROOT / "TEAM_BOARD.md": ("Cowork", COWORK_WINDOW_HINTS),
    ROOT / "REVIEWS_FROM_CODEX.md": ("Cowork", COWORK_WINDOW_HINTS),
    CHANNELS / "checksite_cowork_to_hermes.md": ("Hermes", HERMES_WINDOW_HINTS),
    CHANNELS / "checksite_cowork_to_codex.md": ("Codex", CODEX_WINDOW_HINTS),
    CHANNELS / "checksite_hermes_to_cowork.md": ("Cowork", COWORK_WINDOW_HINTS),
    CHANNELS / "checksite_codex_to_cowork.md": ("Cowork", COWORK_WINDOW_HINTS),
}

KICK_TARGETS = {
    "Hermes": HERMES_WINDOW_HINTS,
    "Cowork": COWORK_WINDOW_HINTS,
    "Codex": CODEX_WINDOW_HINTS,
}

WAKE_MESSAGES = {
    "Hermes": (
        "check bridge. Read C:\\Users\\Mreoc\\checksite\\channels\\checksite_cowork_to_hermes.md "
        "for D-block directives, then TEAM_BOARD.md and USAGE_GUARDRAILS.md. Reply in "
        "checksite_hermes_to_cowork.md with evidence. If you are idle, pick the highest-priority "
        "open Hermes item from seochecksiteToDo.txt / TEAM_BOARD.md and post a status or blocker."
    ),
    "Cowork": (
        "check bridge. Read seochecksiteToDo.txt first, then URGENT_FOR_COWORK.md, Hermes replies, "
        "Codex verdicts, TEAM_BOARD.md, REVIEWS_FROM_CODEX.md, and USAGE_GUARDRAILS.md. Route new "
        "work or update board. If agents are idle but checklist work remains, route the next "
        "specific directive instead of saying quiet."
    ),
    "Codex": (
        "check bridge. Read C:\\Users\\Mreoc\\checksite\\channels\\checksite_cowork_to_codex.md "
        "for R-block reviews, then Hermes replies, TEAM_BOARD.md, REVIEWS_FROM_CODEX.md, and "
        "USAGE_GUARDRAILS.md. Verify with evidence. If no reviews are pending, scan latest Hermes "
        "DONE/PARTIAL claims and post one evidence-backed status or improvement."
    ),
}


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("checksite_bridge_watchdog")


def file_hash(path: Path) -> str:
    try:
        return hashlib.md5(path.read_bytes()).hexdigest()
    except FileNotFoundError:
        return ""


def paused() -> bool:
    return PAUSE_FILE.exists()


def write_heartbeat() -> None:
    try:
        HEARTBEAT_PATH.write_text(time.strftime("%Y-%m-%dT%H:%M:%S%z"), encoding="utf-8")
    except OSError:
        log.exception("Failed to write watcher heartbeat")


def find_window(hints: list[str]):
    seen: list[str] = []
    for hint in hints:
        try:
            candidates = gw.getWindowsWithTitle(hint)
        except Exception:
            candidates = []
        for candidate in candidates:
            seen.append(candidate.title)
        if candidates:
            return candidates[0]
    if seen:
        log.warning("Window hints matched but no candidate returned. Saw: %r", seen)
    return None


def press_alt() -> None:
    USER32.keybd_event(VK_MENU, 0, 0, 0)
    USER32.keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0)


def activate_window(win) -> bool:
    hwnd = getattr(win, "_hWnd", None)
    if not hwnd:
        return False
    try:
        if USER32.IsIconic(hwnd):
            USER32.ShowWindow(hwnd, SW_RESTORE)
        if USER32.SetForegroundWindow(hwnd):
            return True
        press_alt()
        if USER32.SetForegroundWindow(hwnd):
            return True

        foreground = USER32.GetForegroundWindow()
        if not foreground:
            return False
        foreground_thread = USER32.GetWindowThreadProcessId(foreground, None)
        current_thread = KERNEL32.GetCurrentThreadId()
        if foreground_thread == 0 or foreground_thread == current_thread:
            return False

        attached = USER32.AttachThreadInput(current_thread, foreground_thread, True)
        try:
            USER32.BringWindowToTop(hwnd)
            ok = USER32.SetForegroundWindow(hwnd)
            USER32.SetActiveWindow(hwnd)
            USER32.SetFocus(hwnd)
        finally:
            if attached:
                USER32.AttachThreadInput(current_thread, foreground_thread, False)
        return bool(ok)
    except Exception:
        return False


def activate_hwnd(hwnd: int) -> bool:
    if not hwnd:
        return False
    try:
        if USER32.IsIconic(hwnd):
            USER32.ShowWindow(hwnd, SW_RESTORE)
        if USER32.SetForegroundWindow(hwnd):
            return True
        press_alt()
        if USER32.SetForegroundWindow(hwnd):
            return True

        foreground = USER32.GetForegroundWindow()
        if not foreground:
            return False
        foreground_thread = USER32.GetWindowThreadProcessId(foreground, None)
        current_thread = KERNEL32.GetCurrentThreadId()
        if foreground_thread == 0 or foreground_thread == current_thread:
            return False

        attached = USER32.AttachThreadInput(current_thread, foreground_thread, True)
        try:
            USER32.BringWindowToTop(hwnd)
            ok = USER32.SetForegroundWindow(hwnd)
            USER32.SetActiveWindow(hwnd)
            USER32.SetFocus(hwnd)
        finally:
            if attached:
                USER32.AttachThreadInput(current_thread, foreground_thread, False)
        return bool(ok)
    except Exception:
        return False


def wake_message_for(label: str, source: Path | None = None) -> str:
    message = WAKE_MESSAGES.get(label, DEFAULT_WAKE_MESSAGE)
    if source is not None:
        return f"{message} Signal changed: {source.name}."
    return message


def idle_message_for(label: str) -> str:
    message = WAKE_MESSAGES.get(label, DEFAULT_WAKE_MESSAGE)
    return (
        f"{message} Idle check: no bridge files changed for {IDLE_CHECK_SECONDS // 60} minutes. "
        "If active checklist work remains, move one concrete item forward or name the blocker with evidence."
    )


def momentum_message_for(label: str) -> str:
    message = WAKE_MESSAGES.get(label, DEFAULT_WAKE_MESSAGE)
    return (
        f"{message} Momentum sweep: open checklist items remain. Do not sit idle; either advance one "
        "item, route a focused follow-up, or post a short evidence-backed blocker/status."
    )


def send_message(message: str) -> None:
    if pyperclip is not None:
        pyperclip.copy(message)
        pyautogui.hotkey("ctrl", "v")
    else:
        pyautogui.typewrite(message, interval=0.01)
    pyautogui.press("enter")


def focus_input(label: str, win) -> None:
    if not INPUT_CLICK_ENABLED:
        return
    rel_x, rel_y = INPUT_CLICK_RULES.get(label, (0.5, 0.92))
    try:
        if label == "Cowork":
            log.info("Dismissing possible Cowork popup before input click")
            for _ in range(2):
                pyautogui.press("escape")
                time.sleep(0.15)
            dismiss_x = int(win.left + max(10, win.width * COWORK_POPUP_DISMISS_RULE[0]))
            dismiss_y = int(win.top + max(10, win.height * COWORK_POPUP_DISMISS_RULE[1]))
            log.info("Clicking neutral Cowork area at (%s, %s) to dismiss overlays", dismiss_x, dismiss_y)
            pyautogui.click(x=dismiss_x, y=dismiss_y)
            time.sleep(0.2)
            pyautogui.press("escape")
            time.sleep(0.15)
        x = int(win.left + max(10, win.width * rel_x))
        y = int(win.top + max(10, win.height * rel_y))
        log.info("Clicking %s input area at (%s, %s)", label, x, y)
        pyautogui.click(x=x, y=y)
        time.sleep(0.2)
    except Exception:
        log.exception("Failed to click %s input area", label)


def tap_window(label: str, hints: list[str], source: Path | None = None, message: str | None = None) -> bool:
    if paused():
        log.warning("Paused via %s; not waking %s", PAUSE_FILE, label)
        return False
    original_hwnd = USER32.GetForegroundWindow()
    win = find_window(hints)
    if win is None:
        log.warning("%s window not found. Tried hints: %s", label, hints)
        return False
    target_hwnd = getattr(win, "_hWnd", None)
    try:
        if PRE_INJECT_PING:
            log.info("Ping before waking %s; typing starts in %.1fs", label, PING_LEAD_SECONDS)
            if winsound is not None:
                try:
                    winsound.Beep(PING_FREQ_HZ, PING_DURATION_MS)
                except RuntimeError:
                    # If the system cannot play a beep, keep the timing guard.
                    pass
            time.sleep(PING_LEAD_SECONDS)
        log.info("Activating %s window: %r", label, win.title)
        if not activate_window(win):
            log.warning("Activation reported failure for %s. Typing anyway.", label)
        time.sleep(0.4)
        focus_input(label, win)
        outgoing = message or wake_message_for(label, source)
        send_message(outgoing)
        log.info("Sent to %s: %r + Enter", label, outgoing)
        if original_hwnd and original_hwnd != target_hwnd:
            time.sleep(0.15)
            if activate_hwnd(original_hwnd):
                log.info("Restored original foreground window after waking %s", label)
            else:
                log.warning("Could not restore original foreground window after waking %s", label)
        return True
    except Exception:
        log.exception("Failed to tap %s", label)
        return False


class Handler(FileSystemEventHandler):
    def __init__(self) -> None:
        self.last_fired = {path: 0.0 for path in ROUTING}
        self.last_hash = {path: file_hash(path) for path in ROUTING}

    def on_modified(self, event) -> None:
        self._maybe_dispatch(event)

    def on_created(self, event) -> None:
        self._maybe_dispatch(event)

    def _maybe_dispatch(self, event) -> None:
        if event.is_directory:
            return
        try:
            path = Path(event.src_path).resolve()
        except OSError:
            return
        if path not in ROUTING:
            return
        if paused():
            log.info("%s changed, but watcher is paused via %s", path.name, PAUSE_FILE)
            return

        now = time.time()
        if now - self.last_fired[path] < DEBOUNCE_SECONDS:
            return

        current_hash = file_hash(path)
        if current_hash == self.last_hash[path]:
            return

        self.last_hash[path] = current_hash
        self.last_fired[path] = now
        note_activity()
        label, hints = ROUTING[path]
        log.info("%s changed -> waking %s", path.name, label)
        if target_on_cooldown(label):
            return
        if tap_window(label, hints, path):
            mark_target_tapped(label)


last_activity = time.time()
last_tap_by_label: dict[str, float] = {}
last_momentum_sweep = 0.0


def load_last_sent() -> dict[str, float]:
    try:
        raw = json.loads(LAST_SENT_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, dict):
        return {}
    loaded: dict[str, float] = {}
    for label, value in raw.items():
        try:
            loaded[str(label)] = float(value)
        except (TypeError, ValueError):
            continue
    return loaded


def save_last_sent() -> None:
    try:
        LAST_SENT_PATH.write_text(json.dumps(last_tap_by_label, indent=2), encoding="utf-8")
    except OSError:
        log.exception("Failed to write target cooldown state")


def note_activity() -> None:
    global last_activity
    last_activity = time.time()


def target_on_cooldown(label: str) -> bool:
    now = time.time()
    previous = last_tap_by_label.get(label, 0.0)
    if now - previous < TARGET_COOLDOWN_SECONDS:
        log.info(
            "Skipping %s wake; target cooldown %.1fs remaining",
            label,
            TARGET_COOLDOWN_SECONDS - (now - previous),
        )
        return True
    return False


def mark_target_tapped(label: str) -> None:
    last_tap_by_label[label] = time.time()
    save_last_sent()


def kick_all() -> None:
    global last_momentum_sweep
    log.info("Initial kick requested: waking Hermes, Cowork, and Codex once")
    note_activity()
    last_momentum_sweep = time.time()
    for label, hints in KICK_TARGETS.items():
        if target_on_cooldown(label):
            continue
        if tap_window(label, hints):
            mark_target_tapped(label)
        time.sleep(0.25)


def idle_check_all() -> None:
    log.info("Idle check: no bridge activity for %ss; waking Hermes, Cowork, and Codex", IDLE_CHECK_SECONDS)
    note_activity()
    for label, hints in KICK_TARGETS.items():
        if target_on_cooldown(label):
            continue
        if tap_window(label, hints, message=idle_message_for(label)):
            mark_target_tapped(label)
        time.sleep(0.25)


def open_work_exists() -> bool:
    paths = [
        ROOT / "seochecksiteToDo.txt",
        ROOT / "TEAM_BOARD.md",
        CHANNELS / "checksite_hermes_to_cowork.md",
        CHANNELS / "checksite_codex_to_cowork.md",
    ]
    text_parts: list[str] = []
    for path in paths:
        try:
            text_parts.append(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
    text = "\n".join(text_parts)
    active_markers = [
        "- [ ]",
        " WIP ",
        "PARTIAL",
        "FAIL",
        "BLOCKED",
        "HARDENING NEEDED",
        "Investigation complete",
    ]
    return any(marker in text for marker in active_markers)


def momentum_sweep_all() -> None:
    global last_momentum_sweep
    log.info(
        "Momentum sweep: open work detected; waking Hermes, Cowork, and Codex"
    )
    last_momentum_sweep = time.time()
    for label, hints in KICK_TARGETS.items():
        if target_on_cooldown(label):
            continue
        if tap_window(label, hints, message=momentum_message_for(label)):
            mark_target_tapped(label)
        time.sleep(0.25)


def main() -> None:
    parser = argparse.ArgumentParser(description="Watch checksite bridge files and wake reader windows.")
    parser.add_argument(
        "--kick",
        action="store_true",
        help="Wake Hermes, Cowork, and Codex once at startup, then continue watching.",
    )
    args = parser.parse_args()

    CHANNELS.mkdir(parents=True, exist_ok=True)
    log.info("=" * 70)
    log.info("checksite bridge watchdog starting")
    log.info("watching: %s", CHANNELS)
    for path, (label, hints) in ROUTING.items():
        log.info("  %-38s -> wake %s %s", path.name, label, hints)
    log.info("default trigger: %r", DEFAULT_WAKE_MESSAGE)
    for label, message in WAKE_MESSAGES.items():
        log.info("  %s trigger: %r", label, message)
    log.info("pre-inject ping: %s (%sHz x %sms, %.1fs lead)", PRE_INJECT_PING, PING_FREQ_HZ, PING_DURATION_MS, PING_LEAD_SECONDS)
    log.info("pause file: %s", PAUSE_FILE)
    log.info("heartbeat file: %s", HEARTBEAT_PATH)
    log.info("last-sent cooldown file: %s", LAST_SENT_PATH)
    log.info("target cooldown: %ss", TARGET_COOLDOWN_SECONDS)
    log.info("idle check: every %ss without bridge activity", IDLE_CHECK_SECONDS)
    log.info("momentum sweep: every %ss while open work remains", MOMENTUM_SWEEP_SECONDS)
    log.info("startup kick: %s", args.kick)
    log.info("=" * 70)

    handler = Handler()
    observer = Observer()
    observer.schedule(handler, str(CHANNELS), recursive=False)
    observer.schedule(handler, str(ROOT), recursive=False)
    observer.start()
    write_heartbeat()
    last_tap_by_label.update(load_last_sent())
    if args.kick:
        kick_all()
    try:
        last_heartbeat = 0.0
        while True:
            now = time.time()
            if now - last_heartbeat >= WATCHER_HEARTBEAT_SECONDS:
                write_heartbeat()
                last_heartbeat = now
            if not paused() and now - last_momentum_sweep >= MOMENTUM_SWEEP_SECONDS and open_work_exists():
                momentum_sweep_all()
            if not paused() and now - last_activity >= IDLE_CHECK_SECONDS:
                idle_check_all()
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("Ctrl+C received; shutting down")
    finally:
        observer.stop()
        observer.join()
        log.info("checksite bridge watchdog stopped")


if __name__ == "__main__":
    main()
