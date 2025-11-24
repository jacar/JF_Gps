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

async function clearTables() {
    console.log('🧹 Clearing maintenances table...')
    const { error: maintError } = await supabase.from('maintenances').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    if (maintError) console.error('Error clearing maintenances:', maintError)
    else console.log('✅ Maintenances cleared')

    console.log('🧹 Clearing gps_devices table...')
    const { error: devError } = await supabase.from('gps_devices').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    if (devError) console.error('Error clearing gps_devices:', devError)
    else console.log('✅ GPS Devices cleared')
}

clearTables()
