"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { formatSecondsToHMS } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { startTrip, endTrip, getActiveTrip, addTripLocation } from "@/app/actions"
import { LogOut, MapPin, Play, Square, Timer, Gauge, Route } from "lucide-react"
import type { User, Trip } from "@/lib/types"
import { GPSTracker } from "@/components/gps-tracker"
import { DriverCamera, DriverCameraRef } from "@/components/driver-camera"

import { DriverMap } from "@/components/driver-map"

export default function DriverPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [tripDuration, setTripDuration] = useState(0)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [distance, setDistance] = useState(0)
  const [maxSpeed, setMaxSpeed] = useState(0)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoErrorType, setGeoErrorType] = useState<string | null>(null)
  const [showGeoHelp, setShowGeoHelp] = useState(false)
  // Debug state
  const [debugInfo, setDebugInfo] = useState<{
    lastUpdate: string;
    lastCoords: string;
    apiStatus: string;
    gpsAccuracy: number;
  }>({
    lastUpdate: "Nunca",
    lastCoords: "N/A",
    apiStatus: "Inactivo",
    gpsAccuracy: 0
  })
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()

  // const watchIdRef = useRef<number | null>(null) // Removed unused ref
  const startTimeRef = useRef<Date | null>(null)
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const speedsRef = useRef<number[]>([])
  const cameraRef = useRef<DriverCameraRef>(null)

  useEffect(() => {
    const userData = localStorage.getItem("gps_jf_user")

    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)

    if (parsedUser.role !== "driver") {
      router.push("/admin")
      return
    }

    setUser(parsedUser)
    loadActiveTrip(parsedUser.id)
  }, [router])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (activeTrip && startTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000)
        setTripDuration(elapsed)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTrip])

  const loadActiveTrip = async (driverId: string) => {
    const trip = await getActiveTrip(driverId)

    if (trip) {
      setActiveTrip(trip)
      startTimeRef.current = new Date(trip.start_time)
      setDistance(trip.total_distance_km)
      setMaxSpeed(trip.max_speed_kmh)
      // Set initial location from trip start if available, otherwise wait for GPS
      if (trip.start_latitude && trip.start_longitude) {
        setCurrentLocation({ lat: trip.start_latitude, lng: trip.start_longitude })
      }
    }

    setLoading(false)
  }

  const logGeoError = (error: GeolocationPositionError) => {
    console.error("Error de geolocalización:", error)
    setGeoErrorType(error.code.toString())
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setGeoError("Permiso de ubicación denegado. Por favor, habilita el acceso a la ubicación en la configuración de tu navegador y del sistema.")
        setShowGeoHelp(true)
        break
      case error.POSITION_UNAVAILABLE:
        setGeoError("Información de ubicación no disponible.")
        break
      case error.TIMEOUT:
        setGeoError("La solicitud para obtener la ubicación ha caducado.")
        break
      default:
        setGeoError("Un error desconocido ha ocurrido.")
        break
    }
  }

  const ensureGeolocationPermission = async (): Promise<PermissionState> => {
    if (!navigator.permissions) {
      return "prompt" // No hay API de permisos, asumimos que se pedirá
    }
    const result = await navigator.permissions.query({ name: "geolocation" })
    return result.state
  }

  const handleStartTrip = async () => {
    if (!user || !user.vehicle_number) {
      alert("Número de vehículo no configurado")
      return
    }

    if (!navigator.geolocation) {
      alert("Geolocalización no disponible")
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        if (geoError) setGeoError(null)

        try {
          const trip = await startTrip(user.id, user.vehicle_number!, latitude, longitude)
          setActiveTrip(trip)
          startTimeRef.current = new Date()
          lastPositionRef.current = { lat: latitude, lng: longitude }
          setCurrentLocation({ lat: latitude, lng: longitude })
          setDistance(0)
          setMaxSpeed(0)
          speedsRef.current = []
          setLoading(false)
          cameraRef.current?.startCamera()
        } catch (error: any) {
          alert("Error al iniciar viaje")
          setLoading(false)
        }
      },
      (error) => {
        logGeoError(error)
        alert(`No se pudo obtener la ubicación (${error.message || "ver consola"})`)
        setLoading(false)
      },
    )
  }

  const handleEndTrip = async () => {
    if (!activeTrip) return

    setLoading(true)

    // if (watchIdRef.current !== null) {
    //   navigator.geolocation.clearWatch(watchIdRef.current)
    //   watchIdRef.current = null
    // }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const avgSpeed =
          speedsRef.current.length > 0 ? speedsRef.current.reduce((acc: number, curr: number) => acc + curr, 0) / speedsRef.current.length : 0

        try {
          await endTrip(activeTrip.id, latitude, longitude, distance, maxSpeed, Math.round(avgSpeed))
          setActiveTrip(null)
          startTimeRef.current = null
          setTripDuration(0)
          setDistance(0)
          setMaxSpeed(0)
          setCurrentSpeed(0)
          speedsRef.current = []
          lastPositionRef.current = null
          setCurrentLocation(null)
          setLoading(false)
          cameraRef.current?.stopCamera()
        } catch (err: any) {
          alert("Error al finalizar viaje")
          setLoading(false)
        }
      },
      async (error) => {
        const avgSpeed =
          speedsRef.current.length > 0 ? speedsRef.current.reduce((acc: number, curr: number) => acc + curr, 0) / speedsRef.current.length : 0

        try {
          await endTrip(
            activeTrip.id,
            lastPositionRef.current?.lat || 0,
            lastPositionRef.current?.lng || 0,
            distance,
            maxSpeed,
            Math.round(avgSpeed),
          )
          setActiveTrip(null)
          startTimeRef.current = null
          setTripDuration(0)
          setDistance(0)
          setMaxSpeed(0)
          setCurrentSpeed(0)
          speedsRef.current = []
          lastPositionRef.current = null
          setCurrentLocation(null)
          setLoading(false)
          cameraRef.current?.stopCamera()
        } catch (err: any) {
          alert("Error al finalizar viaje")
          setLoading(false)
        }
      },
    )
  }

  const handleLogout = () => {
    if (activeTrip) {
      if (!confirm("Tiene un viaje activo. ¿Desea cerrar sesión de todos modos?")) {
        return
      }
    }

    // if (watchIdRef.current !== null) {
    //   navigator.geolocation.clearWatch(watchIdRef.current)
    // }

    localStorage.removeItem("gps_jf_user")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  const handleLocationUpdate = (speed: number, dist: number, maxSpd: number, lat: number, lng: number) => {
    setCurrentSpeed(speed);
    setDistance(dist);
    setMaxSpeed(maxSpd);
    lastPositionRef.current = { lat, lng };
    setCurrentLocation({ lat, lng });
    speedsRef.current.push(speed);
  };



  const handleForceUpdate = () => {
    if (!navigator.geolocation) {
      alert("Geolocalización no soportada")
      return
    }

    setDebugInfo(prev => ({ ...prev, apiStatus: "Forzando actualización..." }))

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords
        const newSpeed = speed !== null ? speed * 3.6 : 0

        setDebugInfo(prev => ({
          ...prev,
          lastUpdate: new Date().toLocaleTimeString(),
          lastCoords: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          gpsAccuracy: accuracy,
          apiStatus: "Enviando..."
        }))

        if (activeTrip && user) {
          try {
            await addTripLocation(user.id, user.vehicle_number!, latitude, longitude, newSpeed, accuracy)
            setDebugInfo(prev => ({ ...prev, apiStatus: "Enviado OK" }))
            handleLocationUpdate(newSpeed, distance, maxSpeed, latitude, longitude)
          } catch (error: any) {
            setDebugInfo(prev => ({ ...prev, apiStatus: `Error: ${error.message}` }))
          }
        } else {
          setDebugInfo(prev => ({ ...prev, apiStatus: "No hay viaje activo" }))
        }
      },
      (error) => {
        setDebugInfo(prev => ({ ...prev, apiStatus: `Error GPS: ${error.message}` }))
        alert(`Error GPS: ${error.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">Panel del Conductor</h1>
        <Button onClick={handleLogout} variant="ghost" size="sm">
          <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
        </Button>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-md mx-auto space-y-4">
          {user && activeTrip && (
            <GPSTracker
              userId={user.id}
              vehicleId={user.vehicle_number!}
              tripId={activeTrip.id}

              isTripActive={true}
              onLocationUpdate={(speed, dist, maxSpd, lat, lng) => {
                handleLocationUpdate(speed, dist, maxSpd, lat, lng)
                setDebugInfo({
                  lastUpdate: new Date().toLocaleTimeString(),
                  lastCoords: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                  apiStatus: "Auto-actualización",
                  gpsAccuracy: 0 // GPSTracker doesn't pass accuracy yet, but that's fine
                })
              }}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Estado del Viaje</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTrip ? (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Inicio:</span>{" "}
                    {new Date(activeTrip.start_time).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Duración:</span> {formatSecondsToHMS(tripDuration)}
                  </p>
                  <p>
                    <span className="font-medium">Distancia:</span> {distance.toFixed(2)} km
                  </p>
                  <p>
                    <span className="font-medium">Velocidad Máx:</span> {maxSpeed.toFixed(2)} km/h
                  </p>
                  <p>
                    <span className="font-medium">Velocidad Actual:</span> {currentSpeed.toFixed(2)} km/h
                  </p>
                  {currentLocation && (
                    <DriverMap latitude={currentLocation.lat} longitude={currentLocation.lng} />
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No hay viaje activo.</p>
              )}

              <div className="mt-4">
                {!activeTrip ? (
                  <Button
                    onClick={handleStartTrip}
                    disabled={loading || !user?.vehicle_number}
                    className="w-full h-20 text-lg"
                    size="lg"
                  >
                    <Play className="h-6 w-6 mr-2" />
                    Iniciar Viaje
                  </Button>
                ) : (
                  <Button
                    onClick={handleEndTrip}
                    disabled={loading}
                    variant="destructive"
                    className="w-full h-20 text-lg"
                    size="lg"
                  >
                    <Square className="h-6 w-6 mr-2" />
                    Finalizar Viaje
                  </Button>
                )}

                {!user?.vehicle_number && (
                  <p className="text-sm text-destructive mt-2">
                    No tiene un vehículo asignado. Contacte al administrador.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Debug Section */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="w-full mb-2"
            >
              {showDebug ? "Ocultar Depuración" : "Mostrar Depuración GPS"}
            </Button>

            {showDebug && (
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4 text-xs font-mono space-y-1">
                  <p><strong>Última Act:</strong> {debugInfo.lastUpdate}</p>
                  <p><strong>Coords:</strong> {debugInfo.lastCoords}</p>
                  <p><strong>Precisión:</strong> {debugInfo.gpsAccuracy}m</p>
                  <p><strong>Estado API:</strong> {debugInfo.apiStatus}</p>
                  <Button
                    size="sm"
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleForceUpdate}
                  >
                    Forzar Actualización GPS
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {user && <DriverCamera ref={cameraRef} user={user} />}
        </div>
      </main>
    </div>
  )
}
