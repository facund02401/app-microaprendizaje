-- Apuntes del lector (docs/10 D14): respuestas a las preguntas, notas libres y
-- banco de conceptos guardados en la cuenta, para sincronizar dispositivos y exportar.

create table public.node_responses (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  node_id uuid not null references public.nodes (id) on delete cascade,
  answer text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);
create index node_responses_document_idx on public.node_responses (document_id);

alter table public.node_responses enable row level security;
create policy "dueño habilitado" on public.node_responses for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed_user()));

-- Espejo del banco local (lib/concept-bank.ts). document_id es texto porque
-- también guarda conceptos del texto de prueba ("texto-de-prueba").
create table public.concept_bank (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  term text not null,
  definition text not null default '',
  status text not null default 'explained' check (status in ('explained', 'pending')),
  document_id text,
  context_paragraph text,
  source_book_title text not null default '',
  source_chapter_title text not null default '',
  source_node_index int not null default 0,
  saved_at bigint not null,
  primary key (user_id, id)
);

alter table public.concept_bank enable row level security;
create policy "dueño habilitado" on public.concept_bank for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed_user()));

-- Escaneados: cuántas palabras reconstruyó la IA por contexto en cada parte.
alter table public.document_sections add column reconstructed int not null default 0;
