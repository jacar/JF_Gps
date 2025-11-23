-- Delete trips older than 24 hours
DELETE FROM public.trip_locations
WHERE trip_id IN (
    SELECT id FROM public.trips 
    WHERE start_time < NOW() - INTERVAL '24 hours'
);

DELETE FROM public.trips 
WHERE start_time < NOW() - INTERVAL '24 hours';
