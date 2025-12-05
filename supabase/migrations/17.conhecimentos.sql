-- Tabela para armazenar configurações de LLM do usuário
create table conhecimentos_config (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  provider text check (provider in ('openai', 'anthropic', 'google')) not null,
  api_key_encrypted text not null,
  selected_model text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela para armazenar metadados dos documentos
create table conhecimentos_documentos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  nome text not null,
  tipo text check (tipo in ('pdf', 'docx', 'png', 'jpg', 'jpeg')) not null,
  tamanho bigint not null, -- tamanho em bytes
  storage_path text not null, -- caminho no Supabase Storage
  texto_extraido text, -- texto extraído do documento (para pesquisa)
  processado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela para armazenar histórico de consultas/pesquisas
create table conhecimentos_consultas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  documento_ids uuid[], -- array de IDs dos documentos consultados
  pergunta text not null,
  resposta text not null,
  modelo_usado text not null,
  tokens_usados integer,
  created_at timestamptz default now()
);

-- Índices para melhor performance
create index conhecimentos_documentos_user_id_idx on conhecimentos_documentos(user_id);
create index conhecimentos_consultas_user_id_idx on conhecimentos_consultas(user_id);
create index conhecimentos_consultas_created_at_idx on conhecimentos_consultas(created_at desc);

-- Habilitar Row Level Security
alter table conhecimentos_config enable row level security;
alter table conhecimentos_documentos enable row level security;
alter table conhecimentos_consultas enable row level security;

-- Políticas RLS para conhecimentos_config
create policy "Usuários podem ver sua própria configuração"
  on conhecimentos_config for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar sua própria configuração"
  on conhecimentos_config for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar sua própria configuração"
  on conhecimentos_config for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar sua própria configuração"
  on conhecimentos_config for delete
  using (auth.uid() = user_id);

-- Políticas RLS para conhecimentos_documentos
create policy "Usuários podem ver seus próprios documentos"
  on conhecimentos_documentos for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar seus próprios documentos"
  on conhecimentos_documentos for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios documentos"
  on conhecimentos_documentos for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar seus próprios documentos"
  on conhecimentos_documentos for delete
  using (auth.uid() = user_id);

-- Políticas RLS para conhecimentos_consultas
create policy "Usuários podem ver suas próprias consultas"
  on conhecimentos_consultas for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar suas próprias consultas"
  on conhecimentos_consultas for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem deletar suas próprias consultas"
  on conhecimentos_consultas for delete
  using (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_conhecimentos_config_updated_at
  before update on conhecimentos_config
  for each row
  execute function update_updated_at_column();

create trigger update_conhecimentos_documentos_updated_at
  before update on conhecimentos_documentos
  for each row
  execute function update_updated_at_column();

-- Criar bucket no Supabase Storage para documentos
-- Nota: Este comando deve ser executado via interface do Supabase ou API
-- insert into storage.buckets (id, name, public) values ('conhecimentos', 'conhecimentos', false);

-- Políticas de Storage para o bucket conhecimentos
-- Usuários podem fazer upload de seus próprios arquivos
create policy "Usuários podem fazer upload de seus próprios arquivos"
  on storage.objects for insert
  with check (
    bucket_id = 'conhecimentos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Usuários podem visualizar seus próprios arquivos
create policy "Usuários podem visualizar seus próprios arquivos"
  on storage.objects for select
  using (
    bucket_id = 'conhecimentos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Usuários podem atualizar seus próprios arquivos
create policy "Usuários podem atualizar seus próprios arquivos"
  on storage.objects for update
  using (
    bucket_id = 'conhecimentos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Usuários podem deletar seus próprios arquivos
create policy "Usuários podem deletar seus próprios arquivos"
  on storage.objects for delete
  using (
    bucket_id = 'conhecimentos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
