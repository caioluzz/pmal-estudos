-- PMAL Estudos
-- Execute este arquivo uma vez no SQL Editor de um projeto Supabase novo.
-- A interface salva um snapshot JSON por usuário. Isso preserva as relações
-- entre edital, matérias, questões, missões, sessões e ciclo semanal em uma
-- única operação atômica.

create table public.study_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint study_states_state_is_object
    check (jsonb_typeof(state) = 'object')
);

comment on table public.study_states is
  'Estado pessoal completo do PMAL Estudos, isolado por usuário via RLS.';

alter table public.study_states enable row level security;

-- Projetos novos podem não expor tabelas à Data API automaticamente.
-- Revogamos tudo e concedemos apenas as operações usadas pelo frontend.
revoke all on table public.study_states from anon, authenticated;
grant select, insert, update on table public.study_states to authenticated;

create policy "study_states_select_own"
on public.study_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "study_states_insert_own"
on public.study_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "study_states_update_own"
on public.study_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- O primary key já fornece o índice necessário para o predicado de RLS.
