import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oymusmxfhxnahasddghs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXVzbXhmaHhuYWhhc2RkZ2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDA0OSwiZXhwIjoyMDc5MjAwMDQ5fQ.hp6gsB_YqVqyWUfsTBqk7l08FbrjWnUAO6JLhusaT0Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function reloadSchema() {
    try {
        console.log('🔄 Recargando esquema de PostgREST...\n');

        // Intentar ejecutar NOTIFY directamente
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
                channel: 'pgrst',
                payload: 'reload config'
            })
        });

        if (response.ok) {
            console.log('✅ Esquema recargado exitosamente!');
        } else {
            const error = await response.text();
            console.log('⚠️  No se pudo recargar automáticamente:', error);
            console.log('\n💡 Solución alternativa:');
            console.log('1. Ve al dashboard de Supabase: https://supabase.com/dashboard/project/oymusmxfhxnahasddghs');
            console.log('2. Ve a SQL Editor');
            console.log('3. Ejecuta: NOTIFY pgrst, \'reload config\';');
            console.log('\nO simplemente espera 1-2 minutos para que el caché se actualice automáticamente.');
        }

        // Verificar que la función existe
        console.log('\n🔍 Verificando función create_user_safe...');
        const { data, error } = await supabase.rpc('create_user_safe', {
            p_phone_number: '+1234567890',
            p_full_name: 'Test User',
            p_role: 'driver',
            p_vehicle_number: null,
            p_imei: null,
            p_initial_latitude: null,
            p_initial_longitude: null
        });

        if (error) {
            if (error.message.includes('Could not find')) {
                console.log('❌ La función aún no está disponible en el caché de PostgREST');
                console.log('⏳ Espera 1-2 minutos y vuelve a intentar, o recarga manualmente el esquema.');
            } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
                console.log('✅ La función existe y funciona! (El usuario de prueba ya existía)');
            } else {
                console.log('⚠️  Error al probar la función:', error.message);
            }
        } else {
            console.log('✅ La función existe y funciona correctamente!');
            console.log('Usuario de prueba creado:', data);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

reloadSchema();
