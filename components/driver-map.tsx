"use client"

import { Map, Marker } from "pigeon-maps"
import { useState, useEffect } from "react"

interface DriverMapProps {
    latitude: number
    longitude: number
}

/**
 * DriverMap displays a map centered on the given coordinates
 * and shows a vehicle icon marker at that position.
 * Automatically switches to dark mode from 6 PM to 6 AM.
 */
export function DriverMap({ latitude, longitude }: DriverMapProps) {
    const [isDarkMode, setIsDarkMode] = useState(false)

    // Detectar modo noche automáticamente (6 PM - 6 AM)
    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours()
            // Night mode from 6 PM (18) to 6 AM (6)
            setIsDarkMode(hour >= 18 || hour < 6)
        }

        checkTime()
        const interval = setInterval(checkTime, 60000) // Check every minute
        return () => clearInterval(interval)
    }, [])

    const mapProvider = (x: number, y: number, z: number, dpr?: number) => {
        return isDarkMode
            ? `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}${dpr && dpr >= 2 ? '@2x' : ''}.png`
            : `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
    }

    // Round coordinates to 5 decimal places (~1 meter precision) for the key
    // This prevents excessive re-renders while ensuring updates when location changes
    const mapKey = `${latitude.toFixed(5)}-${longitude.toFixed(5)}`

    return (
        <div className="w-full h-[300px] rounded-lg overflow-hidden shadow-md border border-gray-200 mt-4">
            <Map
                key={mapKey}
                provider={mapProvider}
                height={300}
                defaultCenter={[latitude, longitude]}
                center={[latitude, longitude]}
                defaultZoom={16}
                zoom={16}
                dprs={[1, 2]}
            >
                <Marker anchor={[latitude, longitude]} offset={[-12, -12]}>
                    <img src="/carro_g_n.png" alt="Vehicle Icon" className="w-6 h-6" />
                </Marker>
            </Map>
        </div>
    )
}
