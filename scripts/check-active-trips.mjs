import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        envVars[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
    }
});

const client = new Client({
    connectionString: envVars.POSTGRES_URL_NON_POOLING,
});

async function checkActiveTrips() {
    try {
        await client.connect();
        console.log('Connected to database');

        const result = await client.query(`
      SELECT id, driver_id, vehicle_number, start_time, status, created_at
      FROM trips
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);

        console.log('\n=== ACTIVE TRIPS ===');
        console.log(`Found ${result.rows.length} active trips:\n`);

        result.rows.forEach((trip, index) => {
            console.log(`${index + 1}. Trip ID: ${trip.id}`);
            console.log(`   Vehicle: ${trip.vehicle_number}`);
            console.log(`   Driver ID: ${trip.driver_id}`);
            console.log(`   Started: ${trip.start_time}`);
            console.log(`   Created: ${trip.created_at}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

checkActiveTrips();
