-- Script para criar o bucket de conhecimentos no Supabase Storage
-- Execute este script no SQL Editor do Supabase

-- Criar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('conhecimentos', 'conhecimentos', false)
ON CONFLICT (id) DO NOTHING;

-- Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'conhecimentos';
