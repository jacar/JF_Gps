-- Función segura para crear usuario con IMEI
-- Esto evita problemas de caché de esquema en PostgREST al realizar la inserción directamente en la base de datos

create or replace function create_user_safe(
  p_phone_number text,
  p_full_name text,
  p_role text,
  p_vehicle_number text default null,
  p_imei text default null,
  p_initial_latitude double precision default null,
  p_initial_longitude double precision default null
) returns json as $$
declare
  v_result json;
begin
  -- Insertar y devolver el registro creado como JSON
  with inserted as (
    insert into public.users (
      phone_number, 
      full_name, 
      role, 
      vehicle_number, 
      imei, 
      initial_latitude, 
      initial_longitude
    )
    values (
      p_phone_number, 
      p_full_name, 
      p_role, 
      p_vehicle_number, 
      p_imei, 
      p_initial_latitude, 
      p_initial_longitude
    )
    returning *
  )
  select row_to_json(inserted.*) into v_result from inserted;
  
  return v_result;
end;
$$ language plpgsql security definer;
