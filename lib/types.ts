export interface User {
  id: string
  phone_number: string
  full_name: string
  role: "admin" | "driver"
  vehicle_number: string | null
  imei: string | null
  initial_latitude: number | null
  initial_longitude: number | null
  created_at: string
}

export interface Trip {
  id: string
  driver_id: string
  vehicle_number: string
  start_time: string
  end_time: string | null
  start_latitude: number
  start_longitude: number
  end_latitude: number | null
  end_longitude: number | null
  total_distance_km: number
  max_speed_kmh: number
  average_speed_kmh: number
  status: "active" | "completed"
  created_at: string
}

export interface TripLocation {
  id: string
  trip_id: string
  latitude: number
  longitude: number
  speed_kmh: number | null
  accuracy: number | null
  timestamp: string
}

export interface TripWithDriver extends Trip {
  driver: User
}

export interface Vehicle {
  id: string
  vehicle_number: string
  brand: string
  model: string
  year: number
  plate: string
  color: string
  status: "active" | "maintenance" | "inactive"
  imei: string | null
  current_driver_id: string | null
  last_latitude?: number | null
  last_longitude?: number | null
  current_speed?: number | null
  last_position_update?: string | null
  created_at: string
  updated_at: string
}

export interface Device {
  id: string
  imei: string
  device_type: string
  status: "active" | "inactive" | "maintenance"
  vehicle_id: string | null
  last_connection: string | null
  battery_level: number | null
  signal_strength: number | null
  created_at: string
  updated_at: string
}

export interface Maintenance {
  id: string
  vehicle_id: string
  maintenance_type: "preventive" | "corrective" | "inspection"
  description: string
  cost: number
  scheduled_date: string
  completed_date: string | null
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  mechanic_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  report_type: "daily" | "weekly" | "monthly" | "custom"
  title: string
  description: string
  start_date: string
  end_date: string
  generated_by: string
  data: any
  created_at: string
}

export interface Alarm {
  id: string
  device_id: string
  alarm_type: "speed" | "geofence" | "battery" | "offline" | "panic"
  severity: "low" | "medium" | "high" | "critical"
  message: string
  latitude: number | null
  longitude: number | null
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export interface Server {
  id: string
  name: string
  host: string
  port: number
  status: "online" | "offline" | "maintenance"
  cpu_usage: number | null
  memory_usage: number | null
  disk_usage: number | null
  last_check: string | null
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  name: string
  description: string | null
  latitude: number
  longitude: number
  radius: number
  location_type: "office" | "warehouse" | "client" | "checkpoint" | "other"
  created_at: string
  updated_at: string
}

export interface VehicleWithDriver extends Vehicle {
  driver: User | null
}

export interface MaintenanceWithVehicle extends Maintenance {
  vehicle: Vehicle
}

export interface AlarmWithDevice extends Alarm {
  device: Device
}
