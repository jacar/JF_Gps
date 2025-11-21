import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de Supabase
const supabaseUrl = 'https://oymusmxfhxnahasddghs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXVzbXhmaHhuYWhhc2RkZ2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDA0OSwiZXhwIjoyMDc5MjAwMDQ5fQ.hp6gsB_YqVqyWUfsTBqk7l08FbrjWnUAO6JLhusaT0Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupFunction() {
    try {
        console.log('📝 Leyendo archivo SQL...');
        const sqlContent = readFileSync(
            join(__dirname, '005_create_user_rpc.sql'),
            'utf8'
        );

        console.log('🚀 Ejecutando SQL en Supabase...\n');

        // Ejecutar el SQL usando una query directa
        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

        if (error) {
            // Si exec_sql no existe, intentamos crear la función manualmente
            console.log('⚠️  exec_sql no disponible, creando función directamente...\n');

            // Dividir y ejecutar el SQL
            const { error: createError } = await supabase.rpc('create_user_safe', {
                p_phone_number: 'test',
                p_full_name: 'test',
                p_role: 'driver'
            }).then(() => {
                console.log('✅ La función ya existe!');
                return { error: null };
            }).catch(async (e) => {
                if (e.message.includes('Could not find')) {
                    console.log('❌ La función no existe. Necesitas ejecutar el SQL manualmente.\n');
                    console.log('📋 Copia y pega este SQL en el SQL Editor de Supabase:\n');
                    console.log('https://supabase.com/dashboard/project/oymusmxfhxnahasddghs/sql/new\n');
                    console.log('---SQL---');
                    console.log(sqlContent);
                    console.log('---FIN SQL---\n');
                    return { error: e };
                }
                return { error: null };
            });
        } else {
            console.log('✅ Función creada exitosamente!');
            console.log('Resultado:', data);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.log('\n📋 Por favor, ejecuta manualmente el SQL en Supabase:');
        console.log('https://supabase.com/dashboard/project/oymusmxfhxnahasddghs/sql/new\n');
    }
}

setupFunction();
