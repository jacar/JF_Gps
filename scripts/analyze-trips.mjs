import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeTrips() {
    console.log('🔍 Analyzing active trips...')

    // 1. Get active trips
    const { data: trips, error } = await supabase
        .from('trips')
        .select(`
            id, 
            vehicle_number, 
            start_time, 
            driver_id,
            driver:users(full_name, phone_number)
        `)
        .eq('status', 'active')

    if (error) {
        console.error('Error fetching trips:', error)
        return
    }

    console.log(`Found ${trips.length} active trips.\n`)

    const results = []
    for (const trip of trips) {
        // 2. Get last location for this trip
        const { data: lastLoc, error: locError } = await supabase
            .from('trip_locations')
            .select('timestamp, speed_kmh, latitude, longitude')
            .eq('trip_id', trip.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()

        const now = new Date()
        const startTime = new Date(trip.start_time)
        let lastUpdate = startTime
        let speed = 0

        if (lastLoc) {
            lastUpdate = new Date(lastLoc.timestamp)
            speed = lastLoc.speed_kmh || 0
        }

        const hoursActive = ((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1)
        const hoursSinceUpdate = ((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)).toFixed(1)
        const minutesSinceUpdate = ((now.getTime() - lastUpdate.getTime()) / (1000 * 60)).toFixed(0)

        const status = Number(minutesSinceUpdate) > 20 ? 'OFFLINE/STALE' : (speed === 0 ? 'STOPPED' : 'MOVING')

        results.push({
            vehicle: trip.vehicle_number,
            driver: trip.driver?.full_name || 'Unknown',
            phone: trip.driver?.phone_number,
            started: startTime.toISOString(),
            lastUpdate: lastUpdate.toISOString(),
            hoursActive,
            minutesSinceUpdate,
            speed,
            status
        })
    }

    fs.writeFileSync('analysis.json', JSON.stringify(results, null, 2))
    console.log('Analysis written to analysis.json')
}

analyzeTrips()
