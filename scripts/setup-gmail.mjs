import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load env vars manually
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    try {
        const envFile = fs.readFileSync('.env', 'utf8')
        const lines = envFile.split('\n')
        for (const line of lines) {
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
                supabaseUrl = line.split('=')[1].trim().replace(/"/g, '')
            }
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
                supabaseKey = line.split('=')[1].trim().replace(/"/g, '')
            }
        }
    } catch (e) {
        console.log('Could not read .env file')
    }
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function configureGmail() {
    console.log('🔧 Configuración de Gmail para GPS JF\n')

    const appPassword = 'tltyqkwnodmuxriz' // Remove spaces

    console.log('🔄 Guardando configuración...')

    try {
        // Check if settings exist
        const { data: existing } = await supabase.from('settings').select('id').single()

        const smtpConfig = {
            smtp_host: 'smtp.gmail.com',
            smtp_port: 587,
            smtp_user: 'jacomearmando80@gmail.com',
            smtp_pass: appPassword,
            smtp_secure: false,
            company_email: 'jacomearmando80@gmail.com'
        }

        if (existing) {
            await supabase
                .from('settings')
                .update(smtpConfig)
                .eq('id', existing.id)
        } else {
            await supabase
                .from('settings')
                .insert([smtpConfig])
        }

        console.log('✅ Configuración guardada exitosamente!')
        console.log('\nDatos configurados:')
        console.log(`  Host: smtp.gmail.com`)
        console.log(`  Puerto: 587`)
        console.log(`  Usuario: jacomearmando80@gmail.com`)
        console.log(`  Secure: No (STARTTLS)`)
        console.log('\n🎉 Gmail configurado. Ahora puedes enviar correos de prueba.')
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

configureGmail()
