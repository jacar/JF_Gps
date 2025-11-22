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
    if (isTripActive) {
      if (!watchId.current) {
        watchId.current = navigator.geolocation.watchPosition(
          async (position) => {
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

            try {
              await addTripLocation(userId, vehicleId, latitude, longitude, newSpeed);
            } catch (error) {
              console.error("Error adding trip location:", error);
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      }
    } else {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        lastLocation.current = null;
        setCurrentSpeed(0);
        setDistance(0);
        setMaxSpeed(0);
      }
    }

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [isTripActive, userId, vehicleId, onLocationUpdate]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-2xl font-bold">{currentSpeed.toFixed(2)} km/h</p>
      <p>Distancia: {distance.toFixed(2)} km</p>
      <p>Velocidad Máxima: {maxSpeed.toFixed(2)} km/h</p>
    </div>
  );
}
