create table lembretes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  titulo text not null,
  descricao text,
  data date not null,
  hora time,
  prioridade text check (prioridade in ('baixa', 'media', 'alta')) default 'media',
  concluido boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table lembretes enable row level security;

create policy "Usuários podem ver seus próprios lembretes"
  on lembretes for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar seus próprios lembretes"
  on lembretes for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios lembretes"
  on lembretes for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar seus próprios lembretes"
  on lembretes for delete
  using (auth.uid() = user_id);
