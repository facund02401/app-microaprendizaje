-- Ritmo de lectura (docs/10 D19): cuánto tardó el lector en leer cada nodo la
-- primera vez. Solo se guardan lecturas válidas (lib/reading-pace.ts). La clave
-- (user_id, node_id) hace que cuente únicamente la primera lectura de cada nodo.

create table public.node_reading_times (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  node_id uuid not null references public.nodes (id) on delete cascade,
  words int not null check (words > 0),
  seconds int not null check (seconds > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, node_id)
);
create index node_reading_times_recent_idx on public.node_reading_times (user_id, created_at desc);

alter table public.node_reading_times enable row level security;
create policy "dueño habilitado" on public.node_reading_times for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed_user()));
