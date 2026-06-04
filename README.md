# Cat Epub

Leitor de EPUB minimalista, offline-first, com sincronização opt-in via Supabase, IA local, TTS em português e repetição espaçada (FSRS).

---

## Funcionalidades

- **Leitura** — paginado ou scroll, 4 temas (Claro/Sépia/Escuro/Preto OLED), 3 tipografias, margens e entrelinhamento configuráveis
- **Anotações** — 5 cores de highlight, notas Markdown, marcadores, tags hierárquicas, exportação `.md`
- **Pesquisa** — índice TOC hierárquico, pesquisa intra-livro cancelável, pesquisa global (`Cmd+K`)
- **IA** — definir/traduzir selecção, chat RAG com citações clicáveis (Anthropic); embeddings ficam no dispositivo
- **FSRS** — revisão espaçada com geração de flashcards por IA, badge de cards vencidos
- **TTS** — leitura em voz alta pt-PT via Web Speech API, controlo de velocidade e voz
- **Sync** — sincronização opt-in via Supabase (magic-link, RLS); EPUB nunca sai do dispositivo
- **PWA** — instalável em iOS Safari e Android Chrome, funciona 100% offline
- **Tauri** — app desktop nativa (macOS/Windows/Linux) com scan e watch de pasta local

---

## Instalação

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20 LTS |
| pnpm | 9+ |
| Rust | 1.77+ (só para Tauri) |

### PWA (browser)

```bash
git clone --recurse-submodules https://github.com/bundaamarela/mkdir-cat-epub-cd-cat-epub-git-init.git cat-epub
cd cat-epub
pnpm install
pnpm dev
# Abre http://localhost:5173
```

Para produção:

```bash
pnpm build
# Serve o conteúdo de dist/ com qualquer servidor estático
```

### App desktop (Tauri)

```bash
pnpm tauri dev   # desenvolvimento
pnpm tauri build # gera .dmg / .msi / .AppImage
```

---

## Configuração de credenciais

### IA (Anthropic)

1. Obtém uma API key em [console.anthropic.com](https://console.anthropic.com)
2. Em **Definições › IA**: activa o toggle e cola a key (`sk-ant-…`)
3. As queries de chat são enviadas à Anthropic. Os embeddings ficam localmente.

### Sincronização (Supabase)

1. Cria um projecto em [supabase.com](https://supabase.com)
2. Executa `supabase/schema.sql` no SQL Editor do projecto
3. Em **Definições › Sincronização**: cola a URL e a anon key
4. Clica **Iniciar sessão** → magic link no email
5. Clica **Sincronizar agora** para o primeiro sync

### Pasta de livros (Tauri)

1. Em **Definições › Biblioteca local**: clica **Escolher pasta**
2. A app analisa a pasta e subpastas em busca de `.epub`
3. Novos ficheiros são detectados automaticamente e importados

---

## Atalhos de teclado

### Global

| Atalho | Acção |
|---|---|
| `Cmd/Ctrl+K` | Pesquisa global |
| `Cmd/Ctrl+,` | Definições |
| `Cmd/Ctrl+B` | Mostrar / recolher barra lateral |

### No leitor

| Atalho | Acção |
|---|---|
| `←` / `→` | Página anterior / seguinte |
| `Espaço` | Mostrar / ocultar interface |
| `H` | Destacar selecção a amarelo |
| `N` | Painel de notas |
| `B` | Adicionar marcador |
| `F` | Activar / desactivar modo foco |
| `T` | Activar / parar leitura em voz alta |
| `Esc` | Fechar painéis / cancelar selecção |

---

## Arquitectura técnica

```
src/
├── routes/          # React Router — home, library, reader, search, notes, review, settings
├── components/      # Componentes por domínio (reader/, library/, nav/, shared/, settings/)
├── lib/
│   ├── db/          # Dexie v3 — CatEpubDB (books, highlights, notes, bookmarks, flashcards, …)
│   ├── store/       # Zustand — usePrefs (persistido em Dexie)
│   ├── epub/        # foliate-js wrapper — parser, renderer, search
│   ├── ai/          # Anthropic client, embeddings (transformers.js local), RAG, prompts
│   ├── srs/         # FSRS-4.5 scheduler + card generator
│   ├── sync/        # Supabase push/pull, offline queue, useSyncTrigger
│   ├── tts/         # Web Speech TTS com boundary callbacks
│   └── theme/       # 4 temas CSS, applyTheme, auto-schedule
├── types/           # TypeScript interfaces (Book, Highlight, Note, Flashcard, …)
└── styles/          # CSS global + 4 temas (variables only, sem Tailwind)

src-tauri/           # Tauri 2 — scan_library_folder, watch_library_folder, pick_folder
vendor/foliate-js/   # git submodule — EPUB renderer com shadow DOM fechado
supabase/schema.sql  # 7 tabelas + RLS (auth.uid() = user_id)
tests/
├── unit/            # Vitest — DB, SRS, sync, sessions, search (136+ testes)
└── e2e/             # Playwright — import/read/highlight, temas, revisão FSRS
```

**Stack:** React 19 · TypeScript 6 · Vite 8 · Dexie · Zustand · TanStack Query · ts-fsrs · foliate-js · @xenova/transformers · Anthropic SDK · Supabase · Tauri 2

---

## Desenvolvimento

```bash
pnpm dev          # servidor de desenvolvimento
pnpm typecheck    # verificação de tipos
pnpm lint         # ESLint strict
pnpm test --run   # testes unitários (Vitest)
pnpm test:e2e     # testes e2e (Playwright — requer servidor a correr)
pnpm build        # build de produção
```

---

## Licença

MIT — © 2026 Kouran
