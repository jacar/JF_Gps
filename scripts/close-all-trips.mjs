import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
const envContent = readFileSync('.env', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        envVars[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
    }
})

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function closeAllActiveTrips() {
    try {
        console.log('Fetching active trips...')

        const { data: activeTrips, error: fetchError } = await supabase
            .from('trips')
            .select('*')
            .eq('status', 'active')

        if (fetchError) {
            console.error('Error fetching trips:', fetchError)
            return
        }

        console.log(`\nFound ${activeTrips?.length || 0} active trips`)

        if (!activeTrips || activeTrips.length === 0) {
            console.log('No active trips to close.')
            return
        }

        console.log('\nClosing all active trips...\n')

        for (const trip of activeTrips) {
            console.log(`Closing trip ${trip.id} (Vehicle: ${trip.vehicle_number})`)

            const { error: updateError } = await supabase
                .from('trips')
                .update({
                    status: 'completed',
                    end_time: new Date().toISOString(),
                    end_latitude: trip.start_latitude,
                    end_longitude: trip.start_longitude
                })
                .eq('id', trip.id)

            if (updateError) {
                console.error(`  ❌ Error closing trip ${trip.id}:`, updateError)
            } else {
                console.log(`  ✅ Trip ${trip.id} closed successfully`)
            }
        }

        console.log('\n✅ All active trips have been closed.')

    } catch (error) {
        console.error('Error:', error)
    }
}

closeAllActiveTrips()
