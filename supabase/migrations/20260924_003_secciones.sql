-- Procesamiento por secciones (docs/10 D12): el libro entero se sube y se lee
-- gratis; la IA procesa solo las secciones que el lector elige, a medida que lee.

create table public.document_sections (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  idx int not null,
  title text not null,
  -- 'text': rango de párrafos del texto ya extraído · 'pages': bloque de páginas escaneadas
  kind text not null check (kind in ('text', 'pages')),
  para_start int,
  para_end int,
  page_start int,
  page_end int,
  words int not null default 0,
  ocr_pages int not null default 0,
  preview text,
  -- available → queued → processing → done
  status text not null default 'available'
    check (status in ('available', 'queued', 'processing', 'done')),
  cursor int not null default 0,
  ocr_done int not null default 0,
  -- Solo para bloques escaneados: párrafos ya transcriptos del bloque.
  paragraphs jsonb,
  primary key (document_id, idx)
);

alter table public.document_sections enable row level security;
create policy "dueño habilitado" on public.document_sections for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed_user()));

-- Orden de lectura según la posición en el libro (sección * 100000 + párrafo),
-- independiente del orden en que se procesaron.
alter table public.chapters add column start_position bigint not null default 0;
alter table public.nodes add column start_position bigint not null default 0;
create index nodes_position_idx on public.nodes (document_id, start_position);
