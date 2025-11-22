"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUserByPhone(phoneNumber: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("users").select("*").eq("phone_number", phoneNumber).single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user:", error)
    return null
  }

  return data
}

export async function createUser(
  phoneNumber: string,
  fullName: string,
  role: "admin" | "driver",
  vehicleNumber?: string,
  imei?: string,
  initialLatitude?: number,
  initialLongitude?: number,
) {
  const supabase = await createClient()

  // Verificar si el usuario ya existe
  const existingUser = await getUserByPhone(phoneNumber)
  if (existingUser) {
    throw new Error("Este número de teléfono ya está registrado. Por favor, inicia sesión o usa otro número.")
  }

  // Insertar solo campos básicos primero (los que definitivamente existen en el caché)
  const basicData: any = {
    phone_number: phoneNumber,
    full_name: fullName,
    role: role,
  }

  // Agregar vehicle_number solo si está presente
  if (vehicleNumber) {
    basicData.vehicle_number = vehicleNumber
  }

  // Intentar insertar con todos los campos, si falla, usar solo básicos
  let insertData = { ...basicData }

  // Intentar agregar campos nuevos si están disponibles
  if (imei !== undefined) insertData.imei = imei
  if (initialLatitude !== undefined) insertData.initial_latitude = initialLatitude
  if (initialLongitude !== undefined) insertData.initial_longitude = initialLongitude

  const { data, error } = await supabase
    .from("users")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    // Si falla por columnas no encontradas, reintentar solo con campos básicos
    if (error.message.includes("Could not find")) {
      console.warn("⚠️ Algunas columnas no están en el caché, usando solo campos básicos")
      const { data: basicResult, error: basicError } = await supabase
        .from("users")
        .insert(basicData)
        .select()
        .single()

      if (basicError) {
        console.error("Error creating user:", basicError)
        // Verificar si es un error de duplicado
        if (basicError.code === "23505" || basicError.message.includes("duplicate key")) {
          throw new Error("Este número de teléfono ya está registrado. Por favor, inicia sesión o usa otro número.")
        }
        throw new Error(basicError.message)
      }

      revalidatePath("/")
      return basicResult
    }

    console.error("Error creating user:", error)
    // Verificar si es un error de duplicado
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      throw new Error("Este número de teléfono ya está registrado. Por favor, inicia sesión o usa otro número.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}

export async function startTrip(driverId: string, vehicleNumber: string, latitude: number, longitude: number) {
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

    // Registrar la ubicación inicial inmediatamente
    await addTripLocation(driverId, vehicleNumber, latitude, longitude, 0, 0);

    return data;
  } catch (error) {
    console.error("Excepción en startTrip:", error);
    throw error;
  }
}

export async function endTrip(
  tripId: string,
  latitude: number,
  longitude: number,
  totalDistance: number,
  maxSpeed: number,
  avgSpeed: number,
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("trips")
      .update({
        end_latitude: latitude,
        end_longitude: longitude,
        end_time: new Date().toISOString(),
        total_distance_km: totalDistance,
        max_speed_kmh: maxSpeed,
        average_speed_kmh: avgSpeed,
        status: "completed"
      })
      .eq("id", tripId)
      .select()
      .single()

    if (error) {
      console.error("Error al finalizar viaje:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Excepción en endTrip:", error)
    throw error
  }
}

export async function addTripLocation(
  userId: string,
  vehicleId: string,
  latitude: number,
  longitude: number,
  speedKmh?: number,
  accuracy?: number,
) {
  const supabase = await createClient()

  // Buscar el viaje activo para este usuario y vehículo
  const { data: activeTrip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("driver_id", userId)
    .eq("vehicle_number", vehicleId)
    .eq("status", "active")
    .single()

  if (tripError || !activeTrip) {
    console.error("Error al buscar viaje activo o no se encontró ninguno:", tripError)
    throw new Error("No se encontró un viaje activo para registrar la ubicación.")
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
    .single()

  if (error) {
    console.error("Error adding trip location:", error)
    throw new Error(error.message)
  }

  return data
}

export async function getActiveTrips() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("trips")
    .select(`
      *,
      driver:users(*)
    `)
    .eq("status", "active")
    .order("start_time", { ascending: false })

  if (error) {
    console.error("Error fetching active trips:", error)
    return []
  }

  return data
}

export async function getCompletedTrips() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("trips")
    .select(`
      *,
      driver:users(*)
    `)
    .eq("status", "completed")
    .order("start_time", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching completed trips:", error)
    return []
  }

  return data
}

export async function getTripLocations(tripId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("trip_locations")
    .select("*")
    .eq("trip_id", tripId)
    .order("timestamp", { ascending: true })

  if (error) {
    console.error("Error fetching trip locations:", error)
    return []
  }

  return data
}

export async function getActiveTrip(driverId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("driver_id", driverId)
    .eq("status", "active")
    .maybeSingle()

  if (error) {
    console.error("Error fetching active trip:", error)
    return null
  }

  return data
}
