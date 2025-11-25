"use client"

import { useState, useEffect, useRef } from "react"
import { addTripLocation, createSpeedAlarm } from "@/app/actions"
import { getRoadInfo } from "@/lib/nominatim"

interface GPSTrackerProps {
  userId: string;
  vehicleId: string;
  tripId: string;
  isTripActive: boolean;
  onLocationUpdate: (speed: number, distance: number, maxSpeed: number, lat: number, lng: number) => void;
}

// 🎭 MODO DEMO - Cambia a false para modo real
const DEMO_MODE = false;

export function GPSTracker({ userId, vehicleId, tripId, isTripActive, onLocationUpdate }: GPSTrackerProps) {
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [isSpeedingAlert, setIsSpeedingAlert] = useState(false);
  const [speedAlertMessage, setSpeedAlertMessage] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const lastLocation = useRef<{ lat: number; lng: number } | null>(null);
  const distanceRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const lastAlarmTime = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const demoInterval = useRef<NodeJS.Timeout | null>(null);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // 🎭 DEMO MODE - Simula velocidades altas
  useEffect(() => {
    if (DEMO_MODE && isTripActive && tripId) {
      console.log('🎭 MODO DEMO ACTIVADO - Simulando velocidades');

      let demoStep = 0;
      const demoScenarios = [
        { speed: 55, lat: 4.6097, lng: -74.0817, desc: "Exceso en zona urbana (55 km/h)" },
        { speed: 35, lat: 4.6098, lng: -74.0818, desc: "Velocidad normal (35 km/h)" },
        { speed: 85, lat: 4.6500, lng: -74.0500, desc: "Exceso en avenida (85 km/h)" },
        { speed: 60, lat: 4.6501, lng: -74.0501, desc: "Velocidad normal en avenida (60 km/h)" },
      ];

      demoInterval.current = setInterval(async () => {
        const scenario = demoScenarios[demoStep % demoScenarios.length];
        console.log(`🎭 Demo: ${scenario.desc}`);

        setCurrentSpeed(scenario.speed);
        const newMaxSpeed = Math.max(maxSpeedRef.current, scenario.speed);
        maxSpeedRef.current = newMaxSpeed;
        setMaxSpeed(newMaxSpeed);

        onLocationUpdate(scenario.speed, distanceRef.current, newMaxSpeed, scenario.lat, scenario.lng);

        // Simular detección de velocidad
        if (scenario.speed > 70) { // Verificar si excede 70 km/he.now();
          const now = Date.now();
          const timeSinceLastAlarm = now - lastAlarmTime.current;

          if (timeSinceLastAlarm > 5000) { // 5 seg en demo vs 60 seg en real
            try {
              const roadInfo = await getRoadInfo(scenario.lat, scenario.lng);
              const isExceeding = scenario.speed > roadInfo.speedLimit;

              if (isExceeding) {
                console.log(`⚠️ DEMO: Exceso detectado - ${scenario.speed} km/h en ${roadInfo.type} (límite: ${roadInfo.speedLimit})`);

                // Play alert sound (loop)
                if (!audioRef.current) {
                  audioRef.current = new Audio('/fx-loud-emergency-alarm-236420.mp3');
                  audioRef.current.loop = true; // Loop mientras haya exceso
                }

                if (audioRef.current.paused) {
                  audioRef.current.play().catch(e => {
                    console.warn('Could not play audio:', e);
                  });
                }

                setIsSpeedingAlert(true);
                setSpeedAlertMessage(`⚠️ DEMO: REDUCIR VELOCIDAD - Límite: ${roadInfo.speedLimit} km/h`);

                await createSpeedAlarm(
                  userId,
                  vehicleId,
                  scenario.speed,
                  roadInfo.speedLimit,
                  roadInfo.type,
                  roadInfo.roadName,
                  scenario.lat,
                  scenario.lng
                );

                lastAlarmTime.current = now;
              } else {
                // Detener audio cuando ya no hay exceso
                if (audioRef.current && !audioRef.current.paused) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                setIsSpeedingAlert(false);
                setSpeedAlertMessage("");
              }
            } catch (error) {
              console.error('[DEMO] Error:', error);
            }
          }
        } else {
          // Si velocidad baja de 70 km/h, detener cualquier alerta activa
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          setIsSpeedingAlert(false);
          setSpeedAlertMessage("");
        }

        demoStep++;
      }, 10000); // Cambiar escenario cada 10 segundos

      return () => {
        if (demoInterval.current) {
          clearInterval(demoInterval.current);
          demoInterval.current = null;
        }
      };
    }
  }, [DEMO_MODE, isTripActive, tripId, userId, vehicleId, onLocationUpdate]);

  useEffect(() => {
    // Skip real GPS in demo mode
    if (DEMO_MODE) return;

    const isMounted = { current: true };

    if (isTripActive && tripId) {
      if (!watchId.current) {
        console.log(`[GPSTracker] Starting watch for trip ${tripId}`)
        setErrorMsg(null); // Clear previous errors

        watchId.current = navigator.geolocation.watchPosition(
          async (position) => {
            if (!isMounted.current || !isTripActive) {
              console.warn('[GPSTracker] Component unmounted or trip inactive, skipping update');
              return;
            }

            setErrorMsg(null); // Clear error on success
            const { latitude, longitude, speed } = position.coords;
            const newSpeed = speed !== null ? speed * 3.6 : 0; // m/s to km/h
            // Update refs and state for speed
            setCurrentSpeed(newSpeed);

            // Update max speed using ref to avoid stale closure
            const newMaxSpeed = Math.max(maxSpeedRef.current, newSpeed);
            maxSpeedRef.current = newMaxSpeed;
            setMaxSpeed(newMaxSpeed);

            // Compute distance increment
            let newDistance = distanceRef.current;
            if (lastLocation.current) {
              const travelDistance = calculateDistance(
                lastLocation.current.lat,
                lastLocation.current.lng,
                latitude,
                longitude
              );
              newDistance = distanceRef.current + travelDistance;
            }
            distanceRef.current = newDistance;
            setDistance(newDistance);

            // Update last location
            lastLocation.current = { lat: latitude, lng: longitude };

            // Pass fresh values to parent
            onLocationUpdate(newSpeed, newDistance, newMaxSpeed, latitude, longitude);

            // Only try to add location if we still have a valid tripId
            if (tripId && isTripActive) {
              try {
                await addTripLocation(userId, vehicleId, latitude, longitude, newSpeed);

                // ⚡ Speed limit check
                if (newSpeed > 70) { // Solo verificar si excede 70 km/h
                  const now = Date.now();
                  const timeSinceLastAlarm = now - lastAlarmTime.current;

                  // Only create alarm once every 60 seconds to avoid spam
                  if (timeSinceLastAlarm > 60000) {
                    try {
                      const roadInfo = await getRoadInfo(latitude, longitude);
                      const isExceeding = newSpeed > roadInfo.speedLimit;

                      if (isExceeding) {
                        // Play alert sound (loop)
                        if (!audioRef.current) {
                          audioRef.current = new Audio('/fx-loud-emergency-alarm-236420.mp3');
                          audioRef.current.loop = true; // Loop mientras haya exceso
                        }

                        if (audioRef.current.paused) {
                          audioRef.current.play().catch(e => {
                            console.warn('Could not play audio:', e);
                            // Fallback: use browser beep
                            const ctx = new AudioContext();
                            const oscillator = ctx.createOscillator();
                            oscillator.frequency.value = 800;
                            oscillator.connect(ctx.destination);
                            oscillator.start();
                            oscillator.stop(ctx.currentTime + 0.3);
                          });
                        }

                        // Show visual alert
                        setIsSpeedingAlert(true);
                        setSpeedAlertMessage(`⚠️ REDUCIR VELOCIDAD - Límite: ${roadInfo.speedLimit} km/h`);

                        // Create alarm in database
                        await createSpeedAlarm(
                          userId,
                          vehicleId,
                          newSpeed,
                          roadInfo.speedLimit,
                          roadInfo.type,
                          roadInfo.roadName,
                          latitude,
                          longitude
                        );

                        lastAlarmTime.current = now;
                      } else {
                        // Detener audio cuando ya no hay exceso
                        if (audioRef.current && !audioRef.current.paused) {
                          audioRef.current.pause();
                          audioRef.current.currentTime = 0;
                        }
                        setIsSpeedingAlert(false);
                        setSpeedAlertMessage("");
                      }
                    } catch (error) {
                      console.error('[GPSTracker] Error checking speed limits:', error);
                    }
                  }
                }
              } catch (error) {
                console.error("[GPSTracker] Error adding trip location:", error);
              }
            } else {
              console.warn('[GPSTracker] Skipping location update - no active trip')
            }
          },
          (error) => {
            if (!isMounted.current) return;
            console.error("[GPSTracker] Geolocation error object:", error);
            console.error(`[GPSTracker] Error Code: ${error.code}, Message: ${error.message}`);

            let message = "Error de GPS desconocido";
            switch (error.code) {
              case 1: // PERMISSION_DENIED
                message = "Permiso de ubicación denegado. Por favor actívalo.";
                console.error("[GPSTracker] User denied the request for Geolocation.");
                break;
              case 2: // POSITION_UNAVAILABLE
                message = "Ubicación no disponible. Buscando señal...";
                console.error("[GPSTracker] Location information is unavailable.");
                break;
              case 3: // TIMEOUT
                message = "Tiempo de espera agotado. Reintentando...";
                console.error("[GPSTracker] The request to get user location timed out.");
                break;
              default:
                message = `Error de GPS: ${error.message}`;
                console.error("[GPSTracker] An unknown error occurred.");
                break;
            }
            setErrorMsg(message);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // Increased to 30s
            maximumAge: 0
          }
        );
      }
    } else {
      if (watchId.current) {
        console.log('[GPSTracker] Stopping watch')
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        lastLocation.current = null;
        setCurrentSpeed(0);
        setDistance(0);
        setMaxSpeed(0);
        distanceRef.current = 0;
        maxSpeedRef.current = 0;
        setErrorMsg(null);
      }
    }

    return () => {
      isMounted.current = false;
      if (watchId.current) {
        console.log('[GPSTracker] Cleanup: clearing watch')
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [isTripActive, tripId, userId, vehicleId, onLocationUpdate]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
          <p className="font-bold">⚠️ GPS Error</p>
          <p>{errorMsg}</p>
        </div>
      )}
      {isSpeedingAlert && (
        <div className="bg-red-600 border-2 border-red-800 text-white px-4 py-3 rounded-lg mb-4 text-center animate-pulse shadow-lg">
          <p className="font-bold text-lg">{speedAlertMessage}</p>
        </div>
      )}
      <p className="text-2xl font-bold">{currentSpeed.toFixed(2)} km/h</p>
      <p>Distancia: {distance.toFixed(2)} km</p>
      <p>Velocidad Máxima: {maxSpeed.toFixed(2)} km/h</p>
    </div>
  );
}
