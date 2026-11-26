# Guia de Migração para VPS Própria (Self-Hosted) — Organiza-AI

Este documento explica como hospedar todo o ecossistema do **Organiza-AI** em uma **VPS própria** quando sua base de clientes crescer e você quiser controle dedicado de recursos.

---

## 1. Como funciona a arquitetura na VPS

Você pode instalar um painel gratuito de gerenciamento com Docker, como **Coolify** ou **Easypanel** (estilo Vercel/Heroku), em uma VPS Linux (Ubuntu 22.04/24.04) e subir os 3 serviços principais:

1. **Frontend (React / Vite):**
   * Conectado direto ao seu repositório GitHub (`https://github.com/raiosgamaex1966/Organiza-AI`).
   * Build padrão (`npm install && npm run build`) servindo a pasta `dist/`.
2. **Evolution API:**
   * Container Docker oficial da Evolution API + Redis/Postgres para gerenciar as sessões do WhatsApp.
3. **Supabase Self-Hosted:**
   * Subido via **Docker Compose oficial do Supabase** (inclui Postgres, Auth/GoTrue, PostgREST, Realtime, Storage, Kong e Edge Runtime).
   * Depois de subir o banco, basta aplicar todas as migrations da pasta `supabase/migrations/` e subir as Edge Functions da pasta `supabase/functions/`.

---

## 2. Configuração mínima recomendada e custos médios

O Supabase Self-Hosted executa múltiplos containers simultaneamente e precisa de folga de memória para não travar em horários de pico:

* **Configuração mínima recomendada:**
  * **4 vCPU**
  * **8 GB de RAM**
  * **80 GB SSD / NVMe**
* **Custo médio mensal:**
  * **Hetzner (Europa/EUA):** ~€7 a €14/mês (~R\$ 45 a R\$ 85/mês) — melhor custo-benefício.
  * **Contabo / Hostinger / DigitalOcean / Vultr:** ~R\$ 70 a R\$ 240/mês (dependendo da região Brasil ou EUA).

---

## 3. Quando vale a pena migrar?

* **Início até ~500 clientes:**  
  Manter **Vercel + Supabase (Free → Pro \$25/mês)** é mais seguro e exige zero manutenção de servidor (backups automáticos, SSL gerenciado e escalonamento sem dor de cabeça).
* **Escala maior:**  
  Quando o consumo extra de banco/egress no Supabase ficar mais caro do que uma VPS dedicada (ou você precisar de limites maiores de RAM/CPU), todas as suas migrations (`supabase/migrations/`) e Edge Functions (`supabase/functions/`) já estão versionadas no GitHub para migrar rapidamente.
