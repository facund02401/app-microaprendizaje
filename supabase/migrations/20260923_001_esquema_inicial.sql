-- Nodos · Fase 2 · Esquema inicial
-- Uso personal: solo los emails cargados en allowed_emails pueden registrarse
-- y leer/escribir datos. El email del dueño se carga aparte (no vive en el repo):
--   insert into public.allowed_emails (email) values ('tu-email@ejemplo.com');

-- ── Lista de acceso ────────────────────────────────────────────────
create table public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;
-- Sin políticas: nadie la lee desde la API; solo las funciones de abajo.

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke execute on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;

-- Bloquea registros de emails que no están en la lista.
create or replace function public.enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(new.email)
  ) then
    raise exception 'Registro no habilitado para este email';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_signup_allowlist() from public, anon, authenticated;

create trigger enforce_signup_allowlist
  before insert on auth.users
  for each row execute function public.enforce_signup_allowlist();

-- ── Documentos subidos ─────────────────────────────────────────────
-- Estados: uploaded → analyzed (listo para confirmar costo) → extracting
-- (solo PDFs escaneados: transcripción) → segmenting → ready | error
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  author text,
  file_path text not null,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'epub', 'txt')),
  file_size bigint,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'analyzed', 'extracting', 'segmenting', 'ready', 'error')),
  error_message text,
  page_count int,
  ocr_pages int not null default 0,
  ocr_done int not null default 0,
  word_count int,
  paragraph_count int,
  seg_cursor int not null default 0,
  total_nodes int not null default 0,
  lock_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_user_idx on public.documents (user_id, created_at desc);

-- Texto por página (PDF). Las páginas escaneadas se transcriben con IA.
create table public.document_pages (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  page_number int not null,
  text text not null default '',
  needs_ocr boolean not null default false,
  primary key (document_id, page_number)
);

-- Texto final del documento, en párrafos (arreglo JSON de strings).
create table public.document_texts (
  document_id uuid primary key references public.documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paragraphs jsonb not null default '[]'::jsonb
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  order_index int not null,
  title text not null,
  unique (document_id, order_index)
);

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  order_index int not null,
  title text not null,
  excerpt text not null,
  context_glossary jsonb not null default '[]'::jsonb,
  reflection_prompt text not null,
  created_at timestamptz not null default now(),
  unique (document_id, order_index)
);
create index nodes_chapter_idx on public.nodes (chapter_id);

-- ── Seguridad por filas: cada tabla solo para su dueño habilitado ──
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.document_texts enable row level security;
alter table public.chapters enable row level security;
alter table public.nodes enable row level security;

create policy "dueño habilitado" on public.documents for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));
create policy "dueño habilitado" on public.document_pages for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));
create policy "dueño habilitado" on public.document_texts for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));
create policy "dueño habilitado" on public.chapters for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));
create policy "dueño habilitado" on public.nodes for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));

-- ── Archivos originales: bucket privado, carpeta por usuario ───────
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800);

create policy "documentos propios: leer" on storage.objects for select to authenticated
  using (bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_allowed_user()));
create policy "documentos propios: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_allowed_user()));
create policy "documentos propios: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_allowed_user()));
