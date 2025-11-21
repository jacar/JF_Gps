const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://oymusmxfhxnahasddghs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXVzbXhmaHhuYWhhc2RkZ2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDA0OSwiZXhwIjoyMDc5MjAwMDQ5fQ.hp6gsB_YqVqyWUfsTBqk7l08FbrjWnUAO6JLhusaT0Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL() {
    try {
        // Leer el archivo SQL
        const sqlContent = fs.readFileSync(
            path.join(__dirname, '005_create_user_rpc.sql'),
            'utf8'
        );

        console.log('Ejecutando SQL...');
        console.log(sqlContent);
        console.log('\n---\n');

        // Ejecutar el SQL usando la API de Supabase
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });

        if (error) {
            console.error('Error ejecutando SQL:', error);

            // Intentar método alternativo: ejecutar directamente con postgres
            console.log('\nIntentando método alternativo...');

            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: 'postgres://postgres.oymusmxfhxnahasddghs:3iCCgUCEHO7f7iz8@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
            });

            const result = await pool.query(sqlContent);
            console.log('✅ SQL ejecutado exitosamente (método alternativo)');
            console.log('Resultado:', result);

            await pool.end();
        } else {
            console.log('✅ SQL ejecutado exitosamente');
            console.log('Resultado:', data);
        }
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

runSQL();
