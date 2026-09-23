-- La función de acceso no necesita estar expuesta por la API REST (/rpc).
-- Las políticas la referencian por OID, así que siguen funcionando tras moverla.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_allowed_user() set schema private;
