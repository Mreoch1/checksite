/**
 * Direct audit creation script
 * Creates an audit and triggers processing
 */
import { supabase } from '../lib/supabase'
import { inngest } from '../lib/inngest'
import { processAudit } from '../lib/process-audit'

async function createAudit() {
  const url = 'https://seoauditpro.net'
  const email = 'mreoch82@hotmail.com'
  const modules = ['performance', 'crawl_health', 'on_page', 'mobile', 'local', 'accessibility', 'security', 'schema', 'social']

  try {
    console.log(`Creating audit for ${url}...`)
    
    // Get or create customer
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    if (customerError || !customer) {
      console.log('Creating new customer...')
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ email, name: 'Test User' })
        .select()
        .single()

      if (createError || !newCustomer) {
        console.error('Failed to create customer:', createError)
        process.exit(1)
      }
      customer = newCustomer
      console.log(`✅ Created customer: ${customer.id}`)
    } else {
      console.log(`✅ Found existing customer: ${customer.id}`)
    }

    // Create audit
    console.log('Creating audit record...')
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        customer_id: customer.id,
        url,
        status: 'pending',
        total_price_cents: 2499, // $24.99 base package
      })
      .select()
      .single()

    if (auditError || !audit) {
      console.error('Failed to create audit:', auditError)
      process.exit(1)
    }
    console.log(`✅ Created audit: ${audit.id}`)

    // Create audit modules
    console.log(`Creating ${modules.length} audit modules...`)
    const moduleRecords = modules.map((moduleKey: string) => ({
      audit_id: audit.id,
      module_key: moduleKey,
      enabled: true,
    }))

    const { error: modulesError } = await supabase
      .from('audit_modules')
      .insert(moduleRecords)

    if (modulesError) {
      console.error('Error creating audit modules:', modulesError)
    } else {
      console.log(`✅ Created ${modules.length} audit modules`)
    }

    // Update status to running
    await supabase
      .from('audits')
      .update({ status: 'running' })
      .eq('id', audit.id)

    // Trigger Inngest function for background processing
    console.log(`Triggering Inngest function for audit ${audit.id}...`)
    
    try {
      await inngest.send({
        name: 'audit/process',
        data: { auditId: audit.id },
      })
      console.log(`✅ Inngest event sent for audit ${audit.id}`)
      console.log(`\n📧 Audit will be processed and email sent to ${email}`)
      console.log(`\nAudit ID: ${audit.id}`)
      console.log(`URL: ${url}`)
      console.log(`Modules: ${modules.join(', ')}`)
    } catch (error) {
      console.error('❌ Failed to send Inngest event:', error)
      // Fallback to direct processing if Inngest fails
      console.log('Falling back to direct processing...')
      await processAudit(audit.id)
      console.log(`✅ Audit processed directly`)
    }
  } catch (error) {
    console.error('Error creating audit:', error)
    process.exit(1)
  }
}

createAudit()

