const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de Supabase (copied from run-sql.js)
const supabaseUrl = 'https://oymusmxfhxnahasddghs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXVzbXhmaHhuYWhhc2RkZ2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDA0OSwiZXhwIjoyMDc5MjAwMDQ5fQ.hp6gsB_YqVqyWUfsTBqk7l08FbrjWnUAO6JLhusaT0Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL() {
    try {
        // Leer el archivo SQL
        const sqlContent = fs.readFileSync(
            path.join(__dirname, '008_delete_old_trips.sql'),
            'utf8'
        );

        console.log('Ejecutando SQL para eliminar viajes antiguos...');
        console.log(sqlContent);
        console.log('\n---\n');

        // Intentar ejecutar directamente con postgres (método más confiable para DELETE)
        console.log('Conectando a Postgres...');

        const pool = new Pool({
            connectionString: 'postgres://postgres.oymusmxfhxnahasddghs:3iCCgUCEHO7f7iz8@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
            ssl: {
                rejectUnauthorized: false
            }
        });

        const result = await pool.query(sqlContent);
        console.log('✅ SQL ejecutado exitosamente');
        console.log('Resultado:', result);

        await pool.end();

    } catch (err) {
        console.error('Error ejecutando SQL:', err);
        process.exit(1);
    }
}

runSQL();
