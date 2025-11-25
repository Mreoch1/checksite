import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  variant?: 'full' | 'icon'
  className?: string
  showLink?: boolean
}

export default function Logo({ variant = 'full', className = '', showLink = false }: LogoProps) {
  const logoContent = (
    <div className={`flex items-center ${className}`}>
      {variant === 'icon' ? (
        <Image
          src="/logo-icon.svg"
          alt="SEO CheckSite"
          width={40}
          height={40}
          className="mr-2"
        />
      ) : (
        <Image
          src="/logo.svg"
          alt="SEO CheckSite"
          width={180}
          height={54}
          className={className.includes('scale') ? className : ''}
        />
      )}
    </div>
  )

  if (showLink) {
    return (
      <Link href="/" className="inline-block">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}

