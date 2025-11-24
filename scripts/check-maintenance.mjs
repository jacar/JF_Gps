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

async function checkMaintenances() {
    console.log('🔍 Checking maintenances table...')
    const { data, error } = await supabase.from('maintenances').select('*')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(`Found ${data.length} records.`)
    data.forEach(m => {
        console.log(`- ${m.description} (${m.status})`)
    })
}

checkMaintenances()
