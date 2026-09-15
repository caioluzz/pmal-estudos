# PMAL Estudos

Plataforma pessoal para acompanhar a preparação para **Soldado do Quadro de Praças da PMAL**. Funciona em modo local durante o desenvolvimento e sincroniza automaticamente com Supabase quando configurado.

## O que já funciona

- Dashboard com questões, aproveitamento, horas líquidas, ritmo semanal e sugestão de revisão.
- Registro rápido de baterias feitas no QConcursos, com assunto específico obrigatório, subassunto, questões e acertos.
- Mapa de aproveitamento por assunto, com expansão automática quando houver muitos registros.
- Edital verticalizado do cargo de Soldado, separado das estatísticas de questões.
- Quatro estados para cada item: Não iniciado, Lido, Resumido e Revisado.
- Ciclo semanal editável por matéria e dia da semana.
- Alertas automáticos de revisão em 24 horas, 7 dias e 30 dias.
- Gerador de missões que combina as revisões pendentes com as matérias programadas para o dia.
- Dificuldade com efeito real na prioridade e duração sugerida de estudos e revisões.
- Cronômetro de horas líquidas, Pomodoro configurável e diário de bordo.
- Layout responsivo e tema escuro.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem variáveis de ambiente, os dados ficam no `localStorage` do navegador. Os registros de demonstração podem ser apagados diretamente pela tela.

## Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute [`supabase/schema.sql`](supabase/schema.sql).
3. Execute [`supabase/verify.sql`](supabase/verify.sql) e confirme que a tabela possui RLS e três políticas.
4. Copie `.env.example` para `.env.local`.
5. No painel do projeto, abra **Connect** e copie a Project URL e a Publishable key:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

6. Em **Authentication → URL Configuration**, defina a URL local e, depois, o domínio da Vercel como URLs permitidas.
7. Mantenha o provedor de e-mail habilitado. Nunca coloque a `service_role` ou uma secret key no frontend.

Com Supabase configurado, o app exibe cadastro e login. No primeiro acesso, o estado existente no navegador é enviado para a conta; depois disso, alterações são salvas automaticamente. A tabela concede acesso somente ao papel `authenticated`, e as políticas RLS restringem cada linha ao respectivo usuário.

## Publicar na Vercel

1. Envie o projeto para um repositório Git.
2. Importe o repositório na Vercel (framework: Vite).
3. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente.
4. Faça o deploy. O arquivo `vercel.json` já garante o fallback das rotas para a SPA.

## Fonte do edital

Conteúdo inicial baseado no item 19.2 do Edital nº 1 — PMAL, de 19 de março de 2026, especificamente no programa do Cargo 2: Soldado do Quadro de Praças. O edital e o histórico de questões têm propósitos diferentes e permanecem desacoplados no produto.
