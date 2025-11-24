"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { formatSecondsToHMS } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { startTrip, endTrip, getActiveTrip, addTripLocation } from "@/app/actions"
import { LogOut, MapPin, Play, Square, Timer, Gauge, Route, Bell, User as UserIcon, Settings, X, AlertTriangle } from "lucide-react"
import type { User, Trip } from "@/lib/types"
import { GPSTracker } from "@/components/gps-tracker"
import { DriverCamera, DriverCameraRef } from "@/components/driver-camera"
import { DriverMap } from "@/components/driver-map"

// Speedometer Component
const Speedometer = ({ speed }: { speed: number }) => {
  // Clamp speed between 0 and 180 for visual representation
  const clampedSpeed = Math.min(Math.max(speed, 0), 180)
  const rotation = (clampedSpeed / 180) * 180 - 90 // -90 to 90 degrees

  return (
    <div className="relative w-48 h-24 overflow-hidden mx-auto">
      <div className="absolute w-40 h-40 bg-gray-800 rounded-full top-4 left-4 border-8 border-gray-700"></div>
      {/* Gauge Arc (Simplified with CSS gradients or just a needle for now) */}
      <div
        className="absolute w-1 h-20 bg-red-500 origin-bottom left-1/2 top-4 transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      ></div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <span className="text-3xl font-bold text-white">{Math.round(speed)}</span>
        <span className="text-xs text-gray-400 block">KM/H</span>
      </div>
    </div>
  )
}

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

  const startTimeRef = useRef<Date | null>(null)
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const speedsRef = useRef<number[]>([])
  const cameraRef = useRef<DriverCameraRef>(null)

  // Stable callback to prevent infinite re-renders in GPSTracker
  const handleLocationUpdate = useCallback((speed: number, dist: number, maxSpd: number, lat: number, lng: number) => {
    setCurrentSpeed(speed);
    setDistance(dist);
    setMaxSpeed(maxSpd);
    lastPositionRef.current = { lat, lng };
    setCurrentLocation({ lat, lng });
    speedsRef.current.push(speed);
  }, []);

  // Stable callback that includes debug info updates
  const onLocationUpdateWithDebug = useCallback((speed: number, dist: number, maxSpd: number, lat: number, lng: number) => {
    handleLocationUpdate(speed, dist, maxSpd, lat, lng);
    setDebugInfo({
      lastUpdate: new Date().toLocaleTimeString(),
      lastCoords: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      apiStatus: "Auto-actualización",
      gpsAccuracy: 0
    });
  }, [handleLocationUpdate]);

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
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
          setTripDuration(elapsed)
        }
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

    console.log('[handleEndTrip] Starting trip finalization for trip:', activeTrip.id)
    setLoading(true)

    const finalizeState = () => {
      setActiveTrip(null)
      startTimeRef.current = null
      setTripDuration(0)
      setDistance(0)
      setMaxSpeed(0)
      setCurrentSpeed(0)
      speedsRef.current = []
      lastPositionRef.current = null
      setCurrentLocation(null)
      cameraRef.current?.stopCamera()
    }

    let finalLat = 0;
    let finalLng = 0;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 10000
        });
      });
      finalLat = position.coords.latitude;
      finalLng = position.coords.longitude;
    } catch (error) {
      if (lastPositionRef.current) {
        finalLat = lastPositionRef.current.lat;
        finalLng = lastPositionRef.current.lng;
      }
    }

    const avgSpeed =
      speedsRef.current.length > 0 ? speedsRef.current.reduce((acc: number, curr: number) => acc + curr, 0) / speedsRef.current.length : 0

    try {
      await endTrip(activeTrip.id, finalLat, finalLng, distance, maxSpeed, Math.round(avgSpeed))
      finalizeState();
      setTimeout(() => {
        alert("Viaje finalizado correctamente");
      }, 100);

    } catch (err: any) {
      console.error("[handleEndTrip] Error al finalizar viaje:", err)
      alert(`Error al finalizar viaje: ${err.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (activeTrip) {
      if (!confirm("Tiene un viaje activo. ¿Desea cerrar sesión de todos modos?")) {
        return
      }
    }
    localStorage.removeItem("gps_jf_user")
    router.push("/")
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Cargando panel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 md:p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-gray-200">Panel del Conductor</h1>
        <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
          <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
        </Button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Left Column: Profile (3 cols) */}
        <div className="md:col-span-3 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-1">
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                <UserIcon className="h-16 w-16 text-gray-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.full_name || "Conductor"}</h2>
              <p className="text-gray-400">ID: {user?.id?.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Unidad: {user?.vehicle_number || "N/A"}</span>
            </div>
            <Button
              onClick={() => router.push("/driver/profile")}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Editar Perfil
            </Button>
          </div>
        </div>

        {/* Center Column: Controls & Dashboard (6 cols) */}
        <div className="md:col-span-6 space-y-6">

          {/* Trip Status Card */}
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Estado del Viaje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-5 w-5 text-white" />
                <span className="text-lg">{activeTrip ? "Viaje en curso" : "Esperando iniciar viaje"}</span>
              </div>

              {!activeTrip ? (
                <Button
                  onClick={handleStartTrip}
                  className="w-full h-16 text-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-900/20 border-0"
                >
                  <Play className="h-6 w-6 mr-2 fill-current" /> Iniciar Viaje
                </Button>
              ) : (
                <Button
                  onClick={handleEndTrip}
                  className="w-full h-16 text-xl bg-gray-700 hover:bg-gray-600 text-red-400 border border-red-900/30"
                >
                  <Square className="h-6 w-6 mr-2 fill-current" /> Finalizar Viaje
                </Button>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                  className="w-full border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white text-xs"
                >
                  {showDebug ? "Ocultar Depuración" : "Mostrar Depuración GPS"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Map Card (Previously Camera) */}
          <div className="bg-gray-800 rounded-xl p-1 border border-gray-700 overflow-hidden h-[400px]">
            {currentLocation ? (
              <DriverMap latitude={currentLocation.lat} longitude={currentLocation.lng} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 text-xs">
                Esperando ubicación...
              </div>
            )}
          </div>

          {/* Dashboard Gauges */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-700">
              <Speedometer speed={currentSpeed} />
              <span className="text-gray-400 font-serif mt-2">Velocidad Actual</span>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-700">
              <div className="text-5xl font-mono font-bold text-red-500 tracking-wider">
                {formatSecondsToHMS(tripDuration)}
              </div>
              <span className="text-gray-400 font-serif mt-2 uppercase tracking-widest text-sm">Tiempo de Viaje</span>
              <div className="w-8 h-8 rounded-full border-4 border-t-cyan-500 border-r-gray-700 border-b-gray-700 border-l-gray-700 mt-2 animate-spin"></div>
            </div>
          </div>

          {/* Hidden GPS Tracker Logic */}
          {user && activeTrip && (
            <div className="hidden">
              <GPSTracker
                key={activeTrip.id}
                userId={user.id}
                vehicleId={user.vehicle_number!}
                tripId={activeTrip.id}
                isTripActive={true}
                onLocationUpdate={onLocationUpdateWithDebug}
              />
            </div>
          )}

          {/* Debug Info Panel */}
          {showDebug && (
            <Card className="bg-black/50 border-gray-700 text-gray-300">
              <CardContent className="p-4 text-xs font-mono space-y-1">
                <p><strong>Última Act:</strong> {debugInfo.lastUpdate}</p>
                <p><strong>Coords:</strong> {debugInfo.lastCoords}</p>
                <p><strong>Precisión:</strong> {debugInfo.gpsAccuracy}m</p>
                <p><strong>Estado API:</strong> {debugInfo.apiStatus}</p>
                <Button
                  size="sm"
                  className="w-full mt-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-800"
                  onClick={handleForceUpdate}
                >
                  Forzar Actualización GPS
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Notifications & Stats (3 cols) */}
        <div className="md:col-span-3 space-y-6">


          {/* Daily Stats */}
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Estadísticas Diarias</CardTitle>
              <X className="h-4 w-4 text-gray-500 cursor-pointer hover:text-white" />
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg overflow-hidden mb-4 border border-gray-700">
                {user && <DriverCamera ref={cameraRef} user={user} />}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-sm text-gray-400">Distancia</span>
                  <span className="font-mono">{distance.toFixed(1)} km</span>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
