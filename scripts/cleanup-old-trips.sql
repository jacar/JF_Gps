-- Cleanup old active trips (before today)
-- This will mark all trips from before today as completed
-- so they don't appear on the real-time map

UPDATE trips
SET 
  status = 'completed',
  end_time = COALESCE(end_time, start_time + INTERVAL '1 hour'),
  end_latitude = COALESCE(end_latitude, start_latitude),
  end_longitude = COALESCE(end_longitude, start_longitude)
WHERE 
  status = 'active' 
  AND start_time < CURRENT_DATE;

-- Show how many trips were updated
SELECT COUNT(*) as trips_closed FROM trips WHERE status = 'completed' AND end_time >= CURRENT_DATE - INTERVAL '30 days';
