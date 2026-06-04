-- ============================================================================
-- Cat Epub — Supabase schema (Phase 12)
-- ----------------------------------------------------------------------------
-- Executar no Supabase SQL Editor — não é executado automaticamente pela app.
-- Cada utilizador só vê os seus próprios dados via RLS (auth.uid() = user_id).
-- ============================================================================

-- ── books_meta ───────────────────────────────────────────────────────────────
-- IMPORTANTE: o ficheiro EPUB (fileBlob) NÃO é sincronizado — fica no
-- dispositivo. Apenas a metadata é replicada.
create table if not exists public.books_meta (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null,
  language text,
  publisher text,
  "publishedAt" text,
  isbn text,
  "fileSize" bigint not null,
  "fileHash" text not null,
  "coverHue" integer not null,
  "totalCfi" text,
  "spineLength" integer not null,
  category text,
  tags text[] not null default '{}',
  rating integer,
  description text,
  "addedAt" text not null,
  "lastReadAt" text,
  "finishedAt" text,
  "estimatedMinutes" integer,
  "embeddingsStatus" text,
  "embeddingsProgress" integer
);
create index if not exists books_meta_user_idx on public.books_meta(user_id);
alter table public.books_meta enable row level security;
create policy "books_meta_owner" on public.books_meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── highlights ───────────────────────────────────────────────────────────────
create table if not exists public.highlights (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "bookId" text not null,
  "cfiRange" text not null,
  text text not null,
  context text,
  color text not null,
  "semanticTag" text,
  note text,
  tags text[] not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);
create index if not exists highlights_user_idx on public.highlights(user_id);
create index if not exists highlights_updated_idx on public.highlights("updatedAt");
alter table public.highlights enable row level security;
create policy "highlights_owner" on public.highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── notes ────────────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "bookId" text not null,
  cfi text,
  "highlightId" text,
  title text,
  body text not null,
  tags text[] not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);
create index if not exists notes_user_idx on public.notes(user_id);
create index if not exists notes_updated_idx on public.notes("updatedAt");
alter table public.notes enable row level security;
create policy "notes_owner" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── bookmarks ────────────────────────────────────────────────────────────────
create table if not exists public.bookmarks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "bookId" text not null,
  cfi text not null,
  label text,
  "createdAt" text not null
);
create index if not exists bookmarks_user_idx on public.bookmarks(user_id);
create index if not exists bookmarks_created_idx on public.bookmarks("createdAt");
alter table public.bookmarks enable row level security;
create policy "bookmarks_owner" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── flashcards ───────────────────────────────────────────────────────────────
create table if not exists public.flashcards (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  "bookId" text not null,
  "highlightId" text,
  front text not null,
  back text not null,
  due text not null,
  stability double precision not null,
  difficulty double precision not null,
  elapsed_days double precision not null,
  scheduled_days double precision not null,
  reps integer not null,
  lapses integer not null,
  state text not null,
  last_review text,
  "updatedAt" text
);
create index if not exists flashcards_user_idx on public.flashcards(user_id);
create index if not exists flashcards_due_idx on public.flashcards(due);
alter table public.flashcards enable row level security;
create policy "flashcards_owner" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── positions ────────────────────────────────────────────────────────────────
create table if not exists public.positions (
  "bookId" text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  cfi text not null,
  "chapterIndex" integer not null,
  percentage integer not null,
  "updatedAt" text not null,
  primary key ("bookId", user_id)
);
create index if not exists positions_updated_idx on public.positions("updatedAt");
alter table public.positions enable row level security;
create policy "positions_owner" on public.positions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── prefs ────────────────────────────────────────────────────────────────────
-- Singleton por utilizador. Permite múltiplos dispositivos partilhar config.
create table if not exists public.prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  "updatedAt" text not null default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);
alter table public.prefs enable row level security;
create policy "prefs_owner" on public.prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Notas finais ─────────────────────────────────────────────────────────────
-- Conflict resolution: last-write-wins por updatedAt — feito no cliente.
-- Não há triggers de servidor: o cliente envia o timestamp canónico.
