-- Insertar Vehículos
INSERT INTO public.vehicles (vehicle_number, brand, model, year, plate, color, status, current_speed, last_latitude, last_longitude)
VALUES 
('V001', 'Toyota', 'Hilux', 2023, 'ABC-123', 'Blanco', 'active', 0, -12.0464, -77.0428),
('V002', 'Nissan', 'Frontier', 2022, 'XYZ-789', 'Gris', 'active', 45, -12.0500, -77.0500),
('V003', 'Ford', 'Ranger', 2021, 'DEF-456', 'Rojo', 'maintenance', 0, -12.0600, -77.0600)
ON CONFLICT (vehicle_number) DO NOTHING;

-- Insertar Ubicaciones
INSERT INTO public.locations (name, description, latitude, longitude, radius, location_type)
VALUES
('Oficina Central', 'Sede principal de la empresa', -12.0464, -77.0428, 150, 'office'),
('Almacén Norte', 'Centro de distribución norte', -11.9800, -77.0800, 200, 'warehouse'),
('Cliente A', 'Punto de entrega Cliente A', -12.1000, -77.0200, 100, 'client');

-- Insertar Dispositivos
INSERT INTO public.gps_devices (imei, device_type, status, vehicle_id, battery_level, signal_strength)
VALUES
('123456789012345', 'GPS Tracker Pro', 'active', (SELECT id FROM public.vehicles WHERE vehicle_number = 'V001'), 95, 80),
('987654321098765', 'GPS Tracker Lite', 'active', (SELECT id FROM public.vehicles WHERE vehicle_number = 'V002'), 88, 75)
ON CONFLICT (imei) DO NOTHING;

-- Insertar Mantenimientos
INSERT INTO public.maintenances (vehicle_id, maintenance_type, description, cost, scheduled_date, status)
VALUES
((SELECT id FROM public.vehicles WHERE vehicle_number = 'V001'), 'preventive', 'Cambio de aceite 5000km', 150.00, NOW() + INTERVAL '7 days', 'scheduled'),
((SELECT id FROM public.vehicles WHERE vehicle_number = 'V003'), 'corrective', 'Reparación de frenos', 450.00, NOW() - INTERVAL '2 days', 'in_progress');

-- Insertar Alarmas
INSERT INTO public.alarms (device_imei, vehicle_id, alarm_type, severity, message, latitude, longitude)
VALUES
('123456789012345', (SELECT id FROM public.vehicles WHERE vehicle_number = 'V001'), 'speed', 'high', 'Exceso de velocidad (110km/h)', -12.0464, -77.0428),
('987654321098765', (SELECT id FROM public.vehicles WHERE vehicle_number = 'V002'), 'geofence', 'medium', 'Salida de zona autorizada', -12.0500, -77.0500);
