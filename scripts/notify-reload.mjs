import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oymusmxfhxnahasddghs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXVzbXhmaHhuYWhhc2RkZ2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDA0OSwiZXhwIjoyMDc5MjAwMDQ5fQ.hp6gsB_YqVqyWUfsTBqk7l08FbrjWnUAO6JLhusaT0Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFunction() {
    console.log('🔍 Probando función create_user_safe...\n');

    try {
        const { data, error } = await supabase.rpc('create_user_safe', {
            p_phone_number: `+test${Date.now()}`,
            p_full_name: 'Test User',
            p_role: 'driver',
            p_vehicle_number: 'TEST-001',
            p_imei: '123456789012345',
            p_initial_latitude: 18.4861,
            p_initial_longitude: -69.9312
        });

        if (error) {
            console.log('❌ Error:', error.message);
            console.log('\n💡 Si el error es "Could not find the function", necesitas:');
            console.log('1. Ir a Supabase SQL Editor');
            console.log('2. Ejecutar: NOTIFY pgrst, \'reload config\';');
            console.log('3. Esperar 30 segundos y volver a intentar');
        } else {
            console.log('✅ ¡Función funcionando correctamente!');
            console.log('📦 Usuario creado:', data);
            console.log('\n🎉 Todo listo! Ahora puedes usar la aplicación.');
        }
    } catch (err) {
        console.error('❌ Error inesperado:', err.message);
    }
}

testFunction();
