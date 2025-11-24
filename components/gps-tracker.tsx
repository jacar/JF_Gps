"use client"

import { useState, useEffect, useRef } from "react"
import { addTripLocation } from "@/app/actions"

interface GPSTrackerProps {
  userId: string;
  vehicleId: string;
  tripId: string;
  isTripActive: boolean;
  onLocationUpdate: (speed: number, distance: number, maxSpeed: number, lat: number, lng: number) => void;
}

export function GPSTracker({ userId, vehicleId, tripId, isTripActive, onLocationUpdate }: GPSTrackerProps) {
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const lastLocation = useRef<{ lat: number; lng: number } | null>(null);
  const distanceRef = useRef(0);
  const maxSpeedRef = useRef(0);

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

  useEffect(() => {
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
      <p className="text-2xl font-bold">{currentSpeed.toFixed(2)} km/h</p>
      <p>Distancia: {distance.toFixed(2)} km</p>
      <p>Velocidad Máxima: {maxSpeed.toFixed(2)} km/h</p>
    </div>
  );
}
