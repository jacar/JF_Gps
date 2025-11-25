"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/lib/push";

/** Retrieves a user by phone number */
export async function getUserByPhone(phoneNumber: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone_number", phoneNumber)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user:", error);
    return null;
  }
  return data;
}

/** Creates a new user */
export async function createUser(
  phoneNumber: string,
  fullName: string,
  role: "admin" | "driver",
  vehicleNumber?: string,
  imei?: string,
  initialLatitude?: number,
  initialLongitude?: number
) {
  const supabase = await createClient();
  const existingUser = await getUserByPhone(phoneNumber);
  if (existingUser) {
    throw new Error(
      "Este número de teléfono ya está registrado. Por favor, inicia sesión o usa otro número."
    );
  }
  const basicData: any = {
    phone_number: phoneNumber,
    full_name: fullName,
    role,
  };
  if (vehicleNumber) basicData.vehicle_number = vehicleNumber;
  let insertData = { ...basicData };
  if (imei !== undefined) insertData.imei = imei;
  if (initialLatitude !== undefined) insertData.initial_latitude = initialLatitude;
  if (initialLongitude !== undefined) insertData.initial_longitude = initialLongitude;
  const { data, error } = await supabase
    .from("users")
    .insert(insertData)
    .select()
    .single();
  if (error) {
    if (error.message.includes("Could not find")) {
      console.warn("⚠️ Algunas columnas no están en el caché, usando solo campos básicos");
      const { data: basicResult, error: basicError } = await supabase
        .from("users")
        .insert(basicData)
        .select()
        .single();
      if (basicError) {
        console.error("Error creating user:", basicError);
        if (basicError.code === "23505" || basicError.message.includes("duplicate key")) {
          throw new Error(
            "Este número de teléfono ya está registrado. Por favor, inicia sesión o usa otro número."
          );
        }
        throw new Error(basicError.message);
      }
      revalidatePath("/");
      return basicResult;
    }
    console.error("Error creating user:", error);
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      throw new Error(
        "Este número de teléfono ya está registrado. Por favor, inicia sesión o usa otro número."
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/");
  return data;
}

/** Starts a new trip */
export async function startTrip(
  driverId: string,
  vehicleNumber: string,
  latitude: number,
  longitude: number
) {
  try {
    console.log("startTrip received:", { driverId, vehicleNumber, latitude, longitude });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .insert({
        driver_id: driverId,
        vehicle_number: vehicleNumber,
        start_latitude: latitude,
        start_longitude: longitude,
        start_time: new Date().toISOString(),
        status: "active",
      })
      .select()
      .single();
    if (error) {
      console.error("Error al iniciar viaje:", error);
      throw error;
    }
    await addTripLocation(driverId, vehicleNumber, latitude, longitude, 0, 0);
    return data;
  } catch (error) {
    console.error("Excepción en startTrip:", error);
    throw error;
  }
}

/** Ends a trip */
export async function endTrip(
  tripId: string,
  latitude: number,
  longitude: number,
  totalDistance: number,
  maxSpeed: number,
  avgSpeed: number
) {
  try {
    console.log(`[endTrip] Starting for trip ${tripId}`);
    const supabase = await createClient();
    const updateData = {
      end_latitude: latitude,
      end_longitude: longitude,
      end_time: new Date().toISOString(),
      total_distance_km: totalDistance,
      max_speed_kmh: maxSpeed,
      average_speed_kmh: avgSpeed,
      status: "completed" as const,
    };
    const { error } = await supabase.from("trips").update(updateData).eq("id", tripId);
    if (error) {
      console.error("[endTrip] Error al finalizar viaje:", error);
      throw error;
    }
    console.log(`[endTrip] Trip ${tripId} ended successfully`);
    return { success: true };
  } catch (error) {
    console.error("[endTrip] Excepción en endTrip:", error);
    throw error;
  }
}

/** Adds a location to a trip */
export async function addTripLocation(
  userId: string,
  vehicleId: string,
  latitude: number,
  longitude: number,
  speedKmh?: number,
  accuracy?: number
) {
  const supabase = await createClient();
  const { data: activeTrip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("driver_id", userId)
    .eq("vehicle_number", vehicleId)
    .eq("status", "active")
    .single();
  if (tripError || !activeTrip) {
    console.error("Error al buscar viaje activo o no se encontró ninguno:", tripError);
    throw new Error("No se encontró un viaje activo para registrar la ubicación.");
  }
  const { data, error } = await supabase
    .from("trip_locations")
    .insert({
      trip_id: activeTrip.id,
      latitude,
      longitude,
      speed_kmh: speedKmh,
      accuracy,
    })
    .select()
    .single();
  if (error) {
    console.error("Error adding trip location:", error);
    throw new Error(error.message);
  }
  return data;
}

/** Retrieves active trips */
export async function getActiveTrips() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(`
      *,
      driver:users(*)
    `)
    .eq("status", "active")
    .order("start_time", { ascending: false });
  if (error) {
    console.error("Error fetching active trips:", error);
    return [];
  }
  return data;
}

/** Retrieves completed trips */
export async function getCompletedTrips() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(`
      *,
      driver:users(*)
    `)
    .eq("status", "completed")
    .order("start_time", { ascending: false })
    .limit(50);
  if (error) {
    console.error("Error fetching completed trips:", error);
    return [];
  }
  return data;
}

/** Retrieves locations for a trip */
export async function getTripLocations(tripId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_locations")
    .select("*")
    .eq("trip_id", tripId)
    .order("timestamp", { ascending: true });
  if (error) {
    console.error("Error fetching trip locations:", error);
    return [];
  }
  return data;
}

/** Retrieves active trip for a driver */
export async function getActiveTrip(driverId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("driver_id", driverId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    console.error("Error fetching active trip:", error);
    return null;
  }
  return data;
}

/** Closes stale trips */
export async function closeStaleTrips() {
  const supabase = await createClient();
  const now = new Date();
  const staleThresholdHours = 12;
  try {
    const { data: activeTrips, error } = await supabase
      .from("trips")
      .select("id, start_time, vehicle_number")
      .eq("status", "active");
    if (error) throw error;
    if (!activeTrips || activeTrips.length === 0) return 0;
    let closedCount = 0;
    for (const trip of activeTrips) {
      const { data: lastLoc } = await supabase
        .from("trip_locations")
        .select("timestamp")
        .eq("trip_id", trip.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();
      let lastActivityTime = new Date(trip.start_time);
      if (lastLoc) {
        lastActivityTime = new Date(lastLoc.timestamp);
      }
      const hoursSinceActivity = (now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActivity > staleThresholdHours) {
        await supabase
          .from("trips")
          .update({ status: "completed", end_time: now.toISOString() })
          .eq("id", trip.id);
        closedCount++;
      }
    }
    revalidatePath("/");
    return closedCount;
  } catch (error) {
    console.error("Error closing stale trips:", error);
    throw error;
  }
}

/** Sends a test email */
export async function sendTestAlarmEmail(recipientEmail: string) {
  "use server";
  try {
    const { sendEmail } = await import("@/lib/email");
    const result = await sendEmail({
      to: recipientEmail,
      subject: "🚨 Alarma de Prueba - GPS JF",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Alarma de Prueba</h2>
          <p>Este es un correo de prueba del sistema GPS JF.</p>
          <p>Si recibiste este correo, significa que la configuración SMTP está funcionando correctamente.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;"/>
          <p style="color: #666; font-size: 12px;">
            Sistema de Rastreo GPS JF<br/>
            ${new Date().toLocaleString('es-ES')}
          </p>
        </div>
      `,
    });
    return result;
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return { success: false, message: error.message || "Error inesperado" };
  }
}

/** Creates a speed alarm and sends notifications */
export async function createSpeedAlarm(
  driverId: string,
  vehicleNumber: string,
  currentSpeed: number,
  speedLimit: number,
  roadType: string,
  roadName: string,
  latitude: number,
  longitude: number
) {
  try {
    const supabase = await createClient();
    const excess = currentSpeed - speedLimit;
    let severity: "low" | "medium" | "high" | "critical";
    if (excess >= 30) severity = "critical";
    else if (excess >= 20) severity = "high";
    else if (excess >= 10) severity = "medium";
    else severity = "low";
    const message = `Exceso de velocidad: ${Math.round(currentSpeed)} km/h en ${roadName} (${roadType}, límite: ${speedLimit} km/h)`;
    const { data, error } = await supabase
      .from("alarms")
      .insert({
        device_imei: vehicleNumber,
        alarm_type: "speed",
        severity,
        message,
        latitude,
        longitude,
        acknowledged: false,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating speed alarm:", error);
      throw error;
    }
    console.log(`⚠️ Speed alarm created: ${message}`);
    const { data: settings } = await supabase
      .from("settings")
      .select("whatsapp_notifications, push_notifications")
      .single();
    // WhatsApp notification
    if (settings?.whatsapp_notifications) {
      try {
        const { data: driver } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", driverId)
          .single();
        const { sendWhatsAppAlert } = await import("@/lib/whatsapp");
        await sendWhatsAppAlert({
          message: "Exceso de velocidad detectado",
          driverName: driver?.full_name || "Desconocido",
          vehicleNumber,
          speed: Math.round(currentSpeed),
          limit: speedLimit,
          location: roadName,
        });
      } catch (whatsappError) {
        console.error("Error sending WhatsApp:", whatsappError);
      }
    }
    // Push notification
    if (settings?.push_notifications) {
      try {
        await sendPushNotification({
          title: "Alarma de velocidad",
          body: message,
          driverId,
          vehicleNumber,
          speed: Math.round(currentSpeed),
          limit: speedLimit,
          location: roadName,
        });
      } catch (pushError) {
        console.error("Error sending push notification:", pushError);
      }
    }
    return data;
  } catch (error) {
    console.error("Exception in createSpeedAlarm:", error);
    throw error;
  }
}
