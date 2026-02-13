-- Reset table if exists (for fresh install)
drop table if exists public.projects;

-- Create the projects table
create table public.projects (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nombre text not null,
  status text not null, -- 'nuevo', 'en-curso', 'completo', 'terminado'
  "order" numeric default 0,
  tipo text, -- Maps to 'Servicio'
  artista text,
  cliente text,
  fecha_inicio date,
  fecha_fin date, -- Maps to 'Fecha Estimada'
  data jsonb -- Stores extra fields like tasks, conclusion, etc.
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- Create policy to allow anonymous access (since we don't have auth implemented yet)
-- WARNING: This allows anyone with your API key to read/write. 
-- For a real production app, you'd want Authentication.
create policy "Enable access to all users" on public.projects
for all
using (true)
with check (true);

-- ===== V2.0 Migration =====
-- Run this on your existing Supabase database to add financial fields.
-- This is SAFE: it only adds new columns with defaults, no data is deleted.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gastos numeric DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS utilidad numeric DEFAULT 0;
