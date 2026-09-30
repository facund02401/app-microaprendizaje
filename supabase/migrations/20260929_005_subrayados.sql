-- Subrayados del lector (docs/10 D17): pasajes marcados con resaltador, guardados en la
-- cuenta para sincronizar dispositivos y salir en la exportación de apuntes.
-- Espejo de lib/highlights.ts. document_id y node_id son texto (como concept_bank) porque
-- el texto de prueba local no tiene ids de Supabase; solo los documentos de la nube se exportan.

create table public.highlights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  document_id text not null,
  node_id text not null,
  chapter_title text not null default '',
  node_index int not null default 0,
  paragraph int not null,
  start_pos int not null,
  end_pos int not null,
  text text not null,
  created_at bigint not null,
  primary key (user_id, id)
);
create index highlights_document_idx on public.highlights (user_id, document_id);

alter table public.highlights enable row level security;
create policy "dueño habilitado" on public.highlights for all to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed_user()));
