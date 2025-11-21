import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://oymusmxfhxnahasddghs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXVzbXhmaHhuYWhhc2RkZ2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDA0OSwiZXhwIjoyMDc5MjAwMDQ5fQ.hp6gsB_YqVqyWUfsTBqk7l08FbrjWnUAO6JLhusaT0Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('🔍 Verificando esquema de la tabla users...\n');

    try {
        // Intentar insertar un usuario de prueba para ver qué columnas faltan
        const testPhone = `+test${Date.now()}`;
        const { data, error } = await supabase
            .from('users')
            .insert({
                phone_number: testPhone,
                full_name: 'Test User',
                role: 'driver',
                vehicle_number: 'TEST-001',
                imei: '123456789012345',
                initial_latitude: 18.4861,
                initial_longitude: -69.9312
            })
            .select()
            .single();

        if (error) {
            console.log('❌ Error al insertar:', error.message);

            if (error.message.includes('Could not find')) {
                console.log('\n📋 Las columnas no están en el caché de PostgREST.');
                console.log('\n🔧 SOLUCIÓN:');
                console.log('1. Ve a: https://supabase.com/dashboard/project/oymusmxfhxnahasddghs/sql/new');
                console.log('2. Copia y pega el contenido de: scripts/004_complete_schema_with_imei.sql');
                console.log('3. Ejecuta el SQL');
                console.log('4. Luego ejecuta: NOTIFY pgrst, \'reload config\';');
                console.log('\n📄 O copia este SQL directamente:\n');

                const sqlContent = readFileSync(
                    join(__dirname, '004_complete_schema_with_imei.sql'),
                    'utf8'
                );
                console.log('---SQL INICIO---');
                console.log(sqlContent);
                console.log('---SQL FIN---\n');
                console.log('Después ejecuta:');
                console.log('NOTIFY pgrst, \'reload config\';\n');
            }
        } else {
            console.log('✅ ¡Esquema correcto! Usuario de prueba creado:', data);
            console.log('\n🎉 Todo está funcionando correctamente.');

            // Limpiar usuario de prueba
            await supabase.from('users').delete().eq('phone_number', testPhone);
            console.log('🧹 Usuario de prueba eliminado.');
        }
    } catch (err) {
        console.error('❌ Error inesperado:', err.message);
    }
}

checkSchema();
