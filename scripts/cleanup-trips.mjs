import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔄 Closing old active trips...')

// Update all trips from before today to completed status
const { data, error } = await supabase
    .from('trips')
    .update({
        status: 'completed',
        end_time: new Date().toISOString()
    })
    .eq('status', 'active')
    .lt('start_time', new Date().toISOString().split('T')[0])
    .select()

if (error) {
    console.error('❌ Error closing trips:', error)
    process.exit(1)
}

console.log(`✅ Closed ${data?.length || 0} old trips`)

if (data && data.length > 0) {
    console.log('\n📋 Closed trips:')
    data.forEach(trip => {
        console.log(`  - ${trip.vehicle_number} (started: ${new Date(trip.start_time).toLocaleString()})`)
    })
}

console.log('\n✨ Done!')
