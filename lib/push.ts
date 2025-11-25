// lib/push.ts

import { createClient } from '@/lib/supabase/server';

/**
 * Envía una notificación push guardándola en la tabla `push_notifications` de Supabase.
 * La tabla debe existir con los campos: title, body, driver_id, vehicle_id, speed, limit,
 * location, created_at (timestamp).
 */
export async function sendPushNotification(params: {
    title: string;
    body: string;
    driverId: string;
    vehicleNumber: string;
    speed: number;
    limit: number;
    location: string;
}) {
    const supabase = await createClient();
    const { title, body, driverId, vehicleNumber, speed, limit, location } = params;

    const { data, error } = await supabase.from('push_notifications').insert({
        title,
        body,
        driver_id: driverId,
        vehicle_id: vehicleNumber,
        speed,
        speed_limit: limit,
        location,
        created_at: new Date().toISOString(),
    });

    if (error) {
        console.error('Error inserting push notification:', error);
        throw error;
    }
    return data;
}
