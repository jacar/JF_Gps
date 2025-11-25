/**
 * Nominatim API Integration for Road Type Detection
 * Uses OpenStreetMap's Nominatim service to determine road types
 * and appropriate speed limits
 */

interface RoadInfo {
    type: 'highway' | 'urban' | 'unknown'
    speedLimit: number
    roadName: string
    roadType?: string
}

interface NominatimResponse {
    address?: {
        road?: string
        highway?: string
        road_type?: string
    }
    error?: string
}

// Cache to avoid excessive API calls (30 second TTL)
const roadTypeCache = new Map<string, { info: RoadInfo; timestamp: number }>()

// Rate limiting - ensure 1 request per second max
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second

/**
 * Determines road type and speed limit based on GPS coordinates
 * 
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Road information including type and speed limit
 */
export async function getRoadInfo(lat: number, lon: number): Promise<RoadInfo> {
    // Create cache key with reduced precision (saves API calls for nearby locations)
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`

    // Check cache first
    const cached = roadTypeCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 30000) {
        return cached.info
    }

    // Rate limiting
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
    }
    lastRequestTime = Date.now()

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'GPS-JF Tracking System/1.0'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`)
        }

        const data: NominatimResponse = await response.json()

        // Determine road type from response
        const highway = data.address?.highway || data.address?.road_type || 'unknown'

        // Map OSM highway types to our categories
        const highwayTypes = ['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link']
        const isHighway = highwayTypes.includes(highway)

        const roadInfo: RoadInfo = {
            type: isHighway ? 'highway' : highway === 'unknown' ? 'unknown' : 'urban',
            speedLimit: isHighway ? 70 : 40, // 70 km/h for highways, 40 km/h for urban
            roadName: data.address?.road || 'Desconocida',
            roadType: highway
        }

        // Cache the result
        roadTypeCache.set(cacheKey, { info: roadInfo, timestamp: Date.now() })

        return roadInfo

    } catch (error) {
        console.error('Error fetching road info from Nominatim:', error)

        // Graceful degradation: assume urban (safer limit)
        const fallbackInfo: RoadInfo = {
            type: 'urban',
            speedLimit: 40,
            roadName: 'Desconocida (offline)',
            roadType: 'unknown'
        }

        return fallbackInfo
    }
}

/**
 * Clears the cache (useful for testing or memory management)
 */
export function clearRoadCache() {
    roadTypeCache.clear()
}

/**
 * Gets cache size (for debugging)
 */
export function getCacheSize() {
    return roadTypeCache.size
}
