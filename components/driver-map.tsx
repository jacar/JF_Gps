"use client";

import { Map, Marker } from "pigeon-maps";

interface DriverMapProps {
    latitude: number;
    longitude: number;
}

/**
 * DriverMap displays a map centered on the given coordinates
 * and shows a vehicle icon marker at that position.
 * The `key` prop forces the Map component to re‑mount when the
 * coordinates change significantly, ensuring the marker updates correctly.
 */
export function DriverMap({ latitude, longitude }: DriverMapProps) {
    // Round coordinates to 5 decimal places (~1 meter precision) for the key
    // This prevents excessive re-renders while ensuring updates when location changes
    const mapKey = `${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

    return (
        <div className="w-full h-[300px] rounded-lg overflow-hidden shadow-md border border-gray-200 mt-4">
            <Map
                key={mapKey}
                height={300}
                defaultCenter={[latitude, longitude]}
                center={[latitude, longitude]}
                defaultZoom={16}
                zoom={16}
            >
                <Marker anchor={[latitude, longitude]} offset={[-12, -12]}>
                    <img src="/carro_g_n.png" alt="Vehicle Icon" className="w-6 h-6" />
                </Marker>
            </Map>
        </div>
    );
}
