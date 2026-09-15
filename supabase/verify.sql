-- Verificação rápida após executar schema.sql no SQL Editor.
-- As três consultas devem retornar os objetos criados e RLS = true.

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'study_states';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'study_states'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'study_states'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
