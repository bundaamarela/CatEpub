# CLAUDE.md — Cat Epub: Documento Mestre de Desenvolvimento
> **Versão:** 2.0 — Maio de 2026
> **Para:** Kouran, solo founder
> **Estado actual:** Fases 0–12 completas · 136 testes · Fase 13 (polish + build) em curso
>
> **Como usar:** Este ficheiro é lido pelo Claude Code no início de cada sessão. Contém o estado completo do projecto, decisões tomadas, padrões estabelecidos e fases futuras. Lê-o na íntegra antes de qualquer acção.
---
## 0. Contexto Estratégico
### 0.1 Quem é o utilizador
Solo founder a operar entre Moçambique, Angola e Portugal. Construtor de múltiplas plataformas (BizBlueprint, Baooba, Scaraab). Stack familiar: Next.js, Supabase, Stripe, Cursor, ambientes agentic. Esta aplicação é primariamente para **uso pessoal próprio** — não há roadmap comercial imediato, mas a arquitectura deve permitir extensão futura sem reescrita.
### 0.2 O que é o Cat Epub
Aplicação de leitura de ficheiros EPUB com identidade visual estabelecida ("Cat Epub" — gato como mascote), quatro temas tipográficos (claro, sépia, escuro, preto OLED) e foco extremo em minimalismo durante a leitura. Existe um protótipo HTML+React-CDN em `_prototype/` como referência visual e arquitectónica — preserva a identidade, não reescreves do zero.
### 0.3 Princípios não-negociáveis
1. **Minimalismo durante a leitura.** Quando um livro está aberto, zero chrome por defeito.
2. **Personalização profunda.** Tipografia, espaçamento, margens, tema, paginação — tudo configurável.
3. **Offline-first.** A app funciona sem rede. Sync é opt-in e secundária.
4. **Cross-platform com codebase única.** Desktop via Tauri 2, mobile via PWA instalável.
5. **Performance.** EPUB de 5 MB abre em <1s. Mudar de página é instantâneo.
6. **Privacidade.** Dados ficam no dispositivo por defeito. Embeddings de IA nunca saem do device.
### 0.4 O que NÃO construir
- ❌ Loja integrada de livros
- ❌ DRM proprietário
- ❌ Streaks, badges, gamificação social — psicologia predatória
- ❌ Recomendações algorítmicas
- ❌ Mais de 6 fontes ou 4 temas — paralisia de escolha
- ❌ Onboarding extenso — auto-evidente em 30 segundos
- ❌ Bionic Reading como default — evidência empírica contra uso universal
### 0.5 Estado actual do projecto (Maio 2026)
**Fases completas:** 0–12 (136 testes a passar, 3 e2e)
**Branch activa:** `claude/read-claude-section-10-IioJn`
**Remote funcional:** `pat` (origin proxy retorna 403 — usar sempre `git push pat`)
**Último commit:** Fase 12 completa (sync Supabase opt-in)
**A seguir:** Fase 13 (polish, PWA, Tauri builds, README)
**Depois:** Fase 14 (features novas — ver §5/Fase 14)
---
## 1. Stack Técnico
### 1.1 Versões reais instaladas (actualizadas face ao spec original)
| Camada | Versão instalada | Nota |
|---|---|---|
| React | **19** (não 18) | Template Vite instalou 19 — compatível, manter |
| TypeScript | **6** (não 5.4) | Compatível — manter |
| Vite | **8** (não 5) | Compatível — manter |
| Tauri | 2 | Conforme spec |
| Node.js | 20 LTS | Mínimo obrigatório |
| pnpm | 9+ | Não usar npm/yarn |
| Rust | 1.77+ | Para Tauri |
### 1.2 Dependências runtime (instaladas)
```
react-router-dom · zustand · dexie · @tanstack/react-query
ts-fsrs · ulid · date-fns · marked · dompurify
@xenova/transformers · @anthropic-ai/sdk · @supabase/supabase-js
```
### 1.3 Dependências dev (instaladas)
```
vitest · @testing-library/react · @testing-library/jest-dom
@playwright/test · fake-indexeddb · eslint · prettier
vite-plugin-pwa · @tauri-apps/cli
```
### 1.4 foliate-js — decisão especial
**Não está no npm.** Instalado como git submodule:
```bash
git submodule add https://github.com/johnfactotum/foliate-js vendor/foliate-js
git submodule update --init --recursive  # ao clonar
```
Alias Vite em `vite.config.ts`: `'foliate-js': path.resolve(__dirname, 'vendor/foliate-js')`
### 1.5 NÃO usar
- Tailwind CSS (mantém CSS variables)
- Redux / MobX (Zustand é suficiente)
- styled-components / emotion (CSS-in-JS pesa em runtime)
- Material UI / Chakra / Ant Design (impõem identidade visual)
---
## 2. Estrutura de Directórios (estado real)
```
cat-epub/
├── CLAUDE.md
├── README.md
├── _prototype/                        # Referência visual — NÃO editar
│   ├── Cat Epub Reader.html
│   ├── Cat Epub Mockups.html
│   ├── store.jsx
│   ├── icons.jsx
│   └── tweaks-panel.jsx
├── vendor/
│   └── foliate-js/                    # git submodule
├── supabase/
│   └── schema.sql                     # Executar manualmente no Supabase
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── index.tsx                  # RootLayout com Sidebar/MobileNav
│   │   ├── home.tsx                   # ✅ Fase 5 + stats reais (Fase 11)
│   │   ├── library.tsx                # ✅ Fase 5 + "última leitura" (Fase 11)
│   │   ├── reader.tsx                 # ✅ Fase 4 + highlights + IA + TTS + FSRS
│   │   ├── search.tsx                 # ✅ Fase 8
│   │   ├── notes.tsx                  # ✅ Fase 6
│   │   ├── review.tsx                 # ✅ Fase 10
│   │   └── settings.tsx               # ✅ Fase 7 + IA (9) + TTS (11) + Sync (12)
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Button.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Segmented.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx             # ✅ Fase 10
│   │   ├── reader/
│   │   │   ├── ReaderSurface.tsx
│   │   │   ├── ReaderTopBar.tsx      # TOC + Search + Bookmark + Settings + TTS + Chat
│   │   │   ├── ReaderBottomBar.tsx
│   │   │   ├── HighlightToolbar.tsx  # 5 cores + nota + copiar + definir + traduzir + flashcard
│   │   │   ├── PanelTOC.tsx          # ✅ Fase 8
│   │   │   ├── PanelSearch.tsx       # ✅ Fase 8 (busca cancelável via AbortSignal)
│   │   │   ├── PanelNotes.tsx        # ✅ Fase 6
│   │   │   ├── PanelChat.tsx         # ✅ Fase 9 (RAG + citações clicáveis)
│   │   │   ├── PanelSettings.tsx     # ✅ Fase 7 (sliders live)
│   │   │   ├── PanelOverlay.tsx      # Wrapper partilhado (suporta noPadding)
│   │   │   └── AiPopover.tsx         # ✅ Fase 9 (definir/traduzir)
│   │   ├── library/
│   │   │   ├── BookCover.tsx         # Capa real ou procedural (hsl + CatLogo)
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookGrid.tsx
│   │   │   ├── BookList.tsx
│   │   │   ├── ImportDropzone.tsx    # drag+click, multi-file, dedup SHA-256
│   │   │   └── FilterBar.tsx
│   │   ├── home/
│   │   │   ├── Greeting.tsx
│   │   │   ├── StatsBlock.tsx        # ✅ Fase 11 (gráfico SVG 7 dias)
│   │   │   ├── ContinueReading.tsx
│   │   │   └── RecentlyRead.tsx
│   │   └── nav/
│   │       ├── Sidebar.tsx           # Badge de cards due (Fase 10)
│   │       ├── MobileNav.tsx
│   │       └── MobileTopBar.tsx
│   ├── lib/
│   │   ├── epub/
│   │   │   ├── parser.ts             # parseEpub, openEpubBook
│   │   │   ├── renderer.ts           # createRenderer + API completa + TTS marks
│   │   │   ├── pagination.ts
│   │   │   └── search.ts             # searchInBook (cancelável, AbortSignal)
│   │   ├── db/
│   │   │   ├── schema.ts             # CatEpubDB (versão 2 — inclui embeddings)
│   │   │   ├── books.ts
│   │   │   ├── highlights.ts
│   │   │   ├── notes.ts
│   │   │   ├── flashcards.ts
│   │   │   ├── sessions.ts
│   │   │   └── embeddings.ts         # ✅ Fase 9
│   │   ├── store/
│   │   │   ├── prefs.ts              # usePrefs com useShallow obrigatório
│   │   │   └── library.ts
│   │   ├── srs/
│   │   │   ├── scheduler.ts          # FSRS-4.5 wrapper
│   │   │   └── card-generator.ts     # highlightToCard + generateWithAi (DI)
│   │   ├── ai/
│   │   │   ├── client.ts             # Anthropic client (isAiEnabled guard)
│   │   │   ├── rag.ts                # cosineSimilarity + retrieveRelevant
│   │   │   ├── embeddings.ts         # transformers.js (Xenova/all-MiniLM-L6-v2)
│   │   │   └── prompts.ts
│   │   ├── tts/
│   │   │   └── webspeech.ts          # WebSpeechTTS com boundary + pt-PT
│   │   ├── sync/
│   │   │   ├── supabase.ts           # pushChanges/pullChanges/resolveConflicts
│   │   │   └── conflict.ts           # last-write-wins por updatedAt
│   │   ├── theme/
│   │   │   ├── tokens.ts
│   │   │   └── apply.ts
│   │   └── utils/
│   │       ├── cn.ts                 # CSS Modules helper (noUncheckedIndexedAccess)
│   │       ├── date.ts
│   │       ├── debounce.ts
│   │       ├── id.ts
│   │       ├── markdown.ts
│   │       ├── useBreakpoint.ts      # useSyncExternalStore (não useState+useEffect)
│   │       └── useDueCount.ts        # polling 5min para badge FSRS
│   ├── types/
│   │   ├── book.ts
│   │   ├── highlight.ts
│   │   ├── note.ts
│   │   ├── prefs.ts
│   │   ├── flashcard.ts
│   │   └── foliate-js.d.ts           # Tipos ambiente para foliate-js
│   ├── styles/
│   │   ├── globals.css
│   │   ├── themes.css                # 4 temas: light/sepia/dark/black
│   │   └── reader.css
│   └── assets/
│       └── fonts/                    # Pixelify Sans, Lora, Inter, Atkinson (woff2 local)
├── src-tauri/
├── public/
│   └── manifest.webmanifest
└── tests/
    ├── unit/
    │   ├── db.test.ts
    │   ├── srs.test.ts
    │   ├── sync.test.ts
    │   ├── sessions.test.ts
    │   └── search.test.ts
    └── e2e/
        ├── phase4-smoke.spec.ts
        ├── phase6-highlights.spec.ts
        └── reader.spec.ts
```
---
## 3. Sistema de Design
### 3.1 Tokens de cor (CSS Variables em `src/styles/themes.css`)
```css
:root {
  --bg: #ffffff;
  --surface: #f7f7f7;
  --surface-2: #efefef;
  --border: #e8e8e8;
  --border-strong: #d0d0d0;
  --text: #111111;
  --text-2: #555555;
  --text-3: #999999;
  --accent: #111111;
  --highlight-yellow: #fff3a8;
  --highlight-green:  #c8e6b8;
  --highlight-blue:   #b8d8f0;
  --highlight-pink:   #f0c8d8;
  --highlight-purple: #d8c8f0;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.12);
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --sidebar-w: 240px;
  --sidebar-w-collapsed: 60px;
}
.theme-sepia {
  --bg: #f4efe6; --surface: #ede8df; --surface-2: #e3ddd1;
  --border: #d8d0c0; --border-strong: #c8c0b0;
  --text: #2c2418; --text-2: #6b5c48; --text-3: #9c8c78; --accent: #2c2418;
}
.theme-dark {
  --bg: #1c1c1e; --surface: #232325; --surface-2: #2a2a2c;
  --border: #2f2f31; --border-strong: #3a3a3c;
  --text: #e8ddc8; --text-2: #999999; --text-3: #6a6a6a; --accent: #e8ddc8;
}
.theme-black {
  --bg: #000000; --surface: #0a0a0a; --surface-2: #121212;
  --border: #1a1a1a; --border-strong: #2a2a2a;
  --text: #e5c07b; --text-2: #a08850; --text-3: #5a4830; --accent: #e5c07b;
}
```
### 3.2 Tipografia
```css
--font-display: 'Pixelify Sans', system-ui, sans-serif;
--font-serif:   'Lora', Georgia, serif;
--font-sans:    'Inter', -apple-system, sans-serif;
--font-dyslexic:'Atkinson Hyperlegible', sans-serif;
```
**Fontes carregadas localmente** via `@font-face` em `src/assets/fonts/` — nunca CDN.
### 3.3 Escala tipográfica do leitor (defaults)
| Variável | Mobile | Desktop | Min | Max |
|---|---|---|---|---|
| fontSize | 18px | 19px | 14px | 28px |
| lineHeight | 1.6 | 1.65 | 1.4 | 2.2 |
| pageWidth | 92% | 680px | 480px | 900px |
| paragraphSpacing | 0.9em | 1em | 0.5em | 2em |
| paginationMode | paginated | paginated | — | — |
---
## 4. Modelo de Dados (Dexie — versão 2)
```ts
// src/lib/db/schema.ts — versão actual com embeddings
export class CatEpubDB extends Dexie {
  books!: Table<Book, string>;
  positions!: Table<ReadingPosition, string>;
  highlights!: Table<Highlight, string>;
  notes!: Table<Note, string>;
  bookmarks!: Table<Bookmark, string>;
  flashcards!: Table<Flashcard, string>;
  sessions!: Table<ReadingSession, string>;
  prefs!: Table<Preferences, 'singleton'>;
  embeddings!: Table<EmbeddingChunk, string>;  // ← adicionado Fase 9
  sync_queue!: Table<SyncQueueItem, string>;   // ← adicionado Fase 12
  constructor() {
    super('CatEpub');
    this.version(1).stores({
      books: 'id, title, author, addedAt, lastReadAt, fileHash',
      positions: 'bookId, updatedAt',
      highlights: 'id, bookId, color, createdAt, *tags',
      notes: 'id, bookId, highlightId, createdAt, *tags',
      bookmarks: 'id, bookId, createdAt',
      flashcards: 'id, bookId, due, state, highlightId',
      sessions: 'id, bookId, startedAt',
      prefs: 'id',
    });
    this.version(2).stores({
      embeddings: 'id, bookId, chunkIndex',
      sync_queue: 'id, table, createdAt',
    });
  }
}
```
**Tipos adicionados:**
```ts
interface EmbeddingChunk {
  id: string; bookId: string; chunkIndex: number;
  chunkText: string; vector: number[];
}
interface SyncQueueItem {
  id: string; table: string; recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: unknown; createdAt: string;
}
```
---
## 5. Padrões Estabelecidos (aprendidos em produção)
> Esta secção é crítica. Documenta padrões que foram descobertos e validados durante o desenvolvimento. Segue-os sem questionar — cada um resolveu um bug real.
### 5.1 Zustand com useShallow OBRIGATÓRIO
```tsx
// ❌ ERRADO — cria novo objecto a cada render → loop infinito com useSyncExternalStore
const { fontSize, lineHeight } = usePrefs(s => ({ fontSize: s.fontSize, lineHeight: s.lineHeight }));
// ✅ CORRECTO
import { useShallow } from 'zustand/react/shallow';
const { fontSize, lineHeight } = usePrefs(useShallow(s => ({ fontSize: s.fontSize, lineHeight: s.lineHeight })));
```
### 5.2 TanStack Query 5 — queryFn não pode retornar undefined
```ts
// ❌ ERRADO
queryFn: () => positions.getById(bookId)  // retorna undefined se não existe
// ✅ CORRECTO
queryFn: () => positions.getById(bookId).then(p => p ?? null)
```
### 5.3 foliate-js — view.init() requer argumento obrigatório
```ts
// ❌ ERRADO — causa "Cannot destructure property 'lastLocation' of undefined"
await view.init();
// ✅ CORRECTO
await view.init(startCfi ? { lastLocation: startCfi } : {});
```
### 5.4 useBreakpoint — usar useSyncExternalStore
```ts
// ❌ ERRADO — viola react-hooks/set-state-in-effect (eslint-plugin-react-hooks 7.x)
const [isMobile, setIsMobile] = useState(false);
useEffect(() => { ... setIsMobile(...) ... }, []);
// ✅ CORRECTO — usar useSyncExternalStore
// Ver src/lib/utils/useBreakpoint.ts para implementação completa
```
### 5.5 CSS Modules com noUncheckedIndexedAccess
```ts
// ❌ ERRADO — styles.foo é string | undefined
className={styles.root}
// ✅ CORRECTO — usar helper cn()
import { cn } from '@/lib/utils/cn';
className={cn(styles.root)}
// cn() está em src/lib/utils/cn.ts
```
### 5.6 exactOptionalPropertyTypes — props opcionais
```tsx
// ❌ ERRADO — passa undefined a prop opcional
<Component currentHref={currentTocHref} />  // currentTocHref pode ser undefined
// ✅ CORRECTO — conditional spread
<Component {...(currentTocHref !== undefined ? { currentHref: currentTocHref } : {})} />
```
### 5.7 Refs do renderer — nunca ler durante render
```tsx
// ❌ ERRADO — lê ref durante render
<PanelSearch renderer={rendererRef.current} />
// ✅ CORRECTO — passa getter function (lida apenas em callbacks)
const getRenderer = useCallback(() => rendererRef.current, []);
<PanelSearch getRenderer={getRenderer} />
```
### 5.8 PanelSearch dentro de PanelOverlay
```tsx
// PanelSearch tem layout flex-column interno → usar noPadding
<PanelOverlay title="Pesquisa" noPadding>
  <PanelSearch getRenderer={getRenderer} onJumpTo={handleJumpTo} />
</PanelOverlay>
// Sem noPadding, o overflow do body conflitua com o scroll interno do PanelSearch
```
### 5.9 foliate-js shadow DOM fechado — implicação para testes e2e
O `foliate-view` e `foliate-paginator` usam `shadowRoot mode: 'closed'`. Consequências:
- `page.waitForFunction` não consegue aceder ao conteúdo do iframe
- `page.frames()` não lista o iframe (está dentro do shadow fechado)
- **Solução para testes:** validar via IndexedDB (posição, highlights) em vez de conteúdo do iframe
- **Solução para TTS:** renderer expõe `getActiveText()` e `markTtsPosition()` como métodos públicos
### 5.10 Push para GitHub — usar sempre remote `pat`
```bash
# O remote `origin` aponta para proxy local que retorna 403
# USAR SEMPRE:
git push pat <branch>
# Para sincronizar tracking ref do origin (cosmético):
git fetch origin <branch>
```
### 5.11 Vitest — excluir testes e2e
```ts
// vite.config.ts
test: {
  exclude: ['tests/e2e/**', ...defaultExclude]
}
```
---
## 6. Fases de Implementação
### Convenção de gates
```bash
pnpm typecheck && pnpm lint && pnpm test --run && pnpm build
```
Reporta: o que foi feito (max 5 linhas) + critérios cumpridos + "Posso prosseguir para Fase X?"
**Não avança sem resposta afirmativa.**
---
### ✅ FASE 0 — Bootstrap (COMPLETA)
React 19, Vite 8, TS 6, Tauri 2 init (`com.kouran.catepub`), pnpm, estrutura de directórios, ESLint strict, Prettier.
- Commit: `68c16c0 chore: bootstrap cat-epub`
### ✅ FASE 1 — Sistema de design e tema (COMPLETA)
4 temas CSS, 4 fontes locais (woff2), Zustand prefs com Dexie adapter, applyTheme(), resolveTheme('auto').
- 9 testes · Commit: `2bfabab feat(theme): design system and theme switching`
### ✅ FASE 2 — Layout e navegação (COMPLETA)
React Router 6, Sidebar colapsável, MobileNav, MobileTopBar, useBreakpoint (useSyncExternalStore), isReaderRoute (oculta chrome no leitor via JSX, não display:none).
- 18 testes · Commit: `8ddcc9d feat(nav): wire router and responsive chrome`
### ✅ FASE 3 — Camada de base de dados (COMPLETA)
CatEpubDB Dexie v1, repositórios CRUD, seed dev com 3 livros lusófonos reais (Nana/Émile Zola, Os Maias/Eça de Queirós, Mensagem/Fernando Pessoa, A Sibila/Agustina Bessa-Luís).
- 23 testes · Commit: `c504fc6 feat(db): canonical Dexie schema`
### ✅ FASE 4 — EPUB renderer (COMPLETA + bugs corrigidos)
foliate-js submodule, parser.ts, renderer.ts (API completa), ImportDropzone (SHA-256 dedup), reader route (posição persistida debounce 1s).
**Bugs corrigidos nesta fase:**
- `view.init({})` em vez de `view.init()` (ver §5.3)
- `useShallow` no usePrefs (ver §5.1)
- queryFn `?? null` (ver §5.2)
- Vitest excluir e2e (ver §5.11)
- 6 testes e2e (smoke + phase6) · Commit: `f624555 feat(epub): import + render via foliate-js`
### ✅ FASE 5 — Home e Biblioteca (COMPLETA)
Home com saudação por período, stats reais, "Continuar a ler" + "Lidos recentemente", empty state CatEmpty. Library com grid/lista, filtros, categorias, drag-and-drop, eliminação com dupla confirmação, BookCover procedural.
- Commit: `f78f398 feat(library): home and library screens`
### ✅ FASE 6 — Anotações (COMPLETA)
HighlightToolbar (5 cores semânticas, floating sobre selecção do iframe via frameElement coords), PanelNotes (filtros + edição markdown + tags hierárquicas), notas globais `/notes` com exportação `.md`.
- 66 testes · Commit: `51a03e2 feat(annotations): highlights, notes, export`
### ✅ FASE 7 — Modos de leitura (COMPLETA)
PanelSettings com sliders live, modo scroll/paginado (default: paginado), modo foco (zero chrome), check-ins de atenção (cria nota automática), transição automática de tema, Bionic Reading toggle (com aviso experimental).
- Commit: `f961ea3 feat(reading): focus mode, typography panel, auto-theme`
### ✅ FASE 8 — Pesquisa e índice (COMPLETA)
PanelTOC hierárquico (destaque `border-left` no capítulo activo, `aria-current`), searchInBook (cancelável via AbortSignal, yield entre secções), PanelSearch, busca global `/search` (Cmd+K, contexto 30 chars, `<mark>` inline).
- 91 testes · Commit: `a944ecc feat(search): TOC, in-book search, global search`
### ✅ FASE 9 — Camada de IA (COMPLETA)
Cliente Anthropic (`isAiEnabled()` guard), embeddings locais (Xenova/all-MiniLM-L6-v2, background job ao importar, progress na Library), RAG (cosine similarity + top-K), AiPopover (definir/traduzir no toolbar), PanelChat (RAG + citações `[Passagem N]` clicáveis).
- Aviso de privacidade em Settings: "As queries de chat são enviadas para a Anthropic. Os embeddings ficam no teu dispositivo."
- 111 testes · Commits: B1–B5
### ✅ FASE 10 — FSRS (COMPLETA)
scheduler.ts (FSRS-4.5, `createCard/scheduleCard/getDueCards/getDueCount`), card-generator.ts (highlightToCard + generateWithAi com dependency injection), botão Flashcard no HighlightToolbar (+ opção IA), daily review completa (front/back/4 ratings/deep-link "Ver no livro"), badge de contagem na Sidebar (polling 5min).
- 128 testes · Commits: C1–C5
### ✅ FASE 11 — Métricas e TTS (COMPLETA)
Tracking de sessões (auto-pausa 60s inactividade), StatsBlock com dados reais + gráfico SVG 7 dias, "Última leitura" na Library (date-fns formatDistanceToNow), WebSpeechTTS (pt-PT auto, boundary callbacks, markTtsPosition no renderer), botão headphones no ReaderTopBar, pausa automática quando PanelChat abre.
- 136 testes · Commits: D1–D5
### ✅ FASE 12 — Sincronização opt-in (COMPLETA)
`supabase/schema.sql` (tabelas + RLS `auth.uid() = user_id`), supabase.ts (signIn magic link, pushChanges/pullChanges, resolveConflicts last-write-wins), sync_queue offline (event `online` drena), useSyncTrigger em RootLayout (start + debounce 30s), Settings secção Sync.
**NUNCA sincroniza `fileBlob`** — apenas metadata. EPUBs ficam no dispositivo.
- 8 testes sync · Commits: E1–E5
---
### 🔄 FASE 13 — Polish e build de produção (A FAZER)
**Objectivo:** app pronta para uso diário real. PWA instalável. Builds Tauri funcionais. README completo.
**F1. Atalhos de teclado globais (completar/verificar):**
- `Cmd/Ctrl+K` → busca global (feito Fase 8)
- `Cmd/Ctrl+,` → settings
- `Cmd/Ctrl+B` → toggle sidebar
- No reader: `←/→` páginas · `Espaço` toggle UI · `H` highlight amarelo · `B` bookmark · `N` nota · `F` focus mode · `T` toggle TTS
**F2. Lazy loading de rotas:**
```tsx
const Library = React.lazy(() => import('./library'));
// Aplicar a todas as rotas excepto Home
```
**F3. PWA completo:**
- `manifest.webmanifest` com ícones de gato em todos os tamanhos
- Service worker via vite-plugin-pwa (Workbox, cache-first para assets, network-first para API)
- Offline shell: quando sem rede, app continua 100% funcional
- Instalar em iOS Safari (Add to Home Screen) e Android Chrome
**F4. Build Tauri:**
- macOS: universal binary (arm64 + x86_64) → `.dmg`
- Windows: `.msi` via WiX
- Linux: `.AppImage` e `.deb`
- Bundle identifier: `com.kouran.catepub`
- Ícone: CatLogo em todos os formatos (512px PNG → gerar variantes)
**F5. Scan de pasta local (Tauri-only):**
```rust
// src-tauri/src/main.rs — comandos Tauri a implementar:
// scan_library_folder(path: String) -> Vec<EpubFile>
// watch_library_folder(path: String) -> watch daemon
```
- Settings > Biblioteca: campo "Pasta de livros" com botão "Escolher pasta"
- Ao configurar: scan inicial de todos os `.epub` na pasta e subpastas
- Watch daemon: detecta novos ficheiros e notifica a app (evento Tauri)
- App recebe evento e importa automaticamente
- **Apenas em Tauri** — não disponível em PWA (sem acesso ao filesystem)
**F6. Conversão de formatos para EPUB (Tauri-only):**
- Suporte a drop de `.pdf`, `.docx`, `.txt`, `.html`
- Conversão via `pandoc` (binário incluído no bundle Tauri) ou `calibre` headless
- Output: EPUB limpo e padronizado, guardado na pasta de livros configurada
- **Fallback em PWA:** mensagem "Conversão disponível apenas na app desktop"
**F7. Testes e2e completos (Playwright):**
```ts
// Fluxos obrigatórios:
// 1. importar → abrir → ler → highlight → fechar → reabrir (verifica persistência)
// 2. trocar tema → verificar todas as variáveis CSS
// 3. daily review com 3 cards (criar via DB inject)
// 4. TTS play → pause → resume → stop
// 5. busca global com resultado clicável
```
**F8. README.md completo:**
- Screenshots de cada ecrã (tirar com Playwright headless)
- Instalação desktop (Tauri) e PWA
- Configuração de API keys (Anthropic, Supabase, ElevenLabs)
- Todos os atalhos de teclado
- Como adicionar pasta de livros (Tauri)
- Arquitectura técnica (para referência futura)
**F9. Optimização de bundle:**
- Target: bundle inicial <300 KB gzipped
- Lighthouse score >=95 em Performance/Accessibility/Best Practices
- transformers.js carregado apenas quando IA activa (dynamic import)
**Gate 13:**
```bash
pnpm typecheck && pnpm lint && pnpm test --run && pnpm test:e2e && pnpm build
# + verificar manualmente: PWA instala · Tauri build corre · atalhos funcionam
```
---
### 📋 FASE 14 — Features Pós-MVP (após Fase 13 aprovada)
> Estas features foram discutidas e acordadas mas não fazem parte do MVP. Implementar apenas quando Fase 13 estiver completa e testada em uso real.
**P1. Vista duas colunas (landscape):**
- Terceiro modo de paginação além de paginado/scroll
- Activo automaticamente em landscape em tablet/desktop wide
- foliate-js suporta via renderer — implementar como opção no PanelSettings
- Toggle manual nas Definições
**P2. Edição de metadados:**
- Modal de edição: título, autor, capa (upload ou URL), descrição, série, volume, tags, rating
- **Não altera o ficheiro EPUB original** — guarda em DB (`books` table)
- Acessível via botão "..." na Library card
- Upload de capa personalizada → guarda como `coverBlob`
**P3. Importação em massa:**
- Aceitar múltiplos EPUBs em simultâneo (já parcialmente implementado no dropzone)
- Progress bar global de importação ("Importando 12/47 livros...")
- Detecção e skip de duplicados com relatório final
- Timeout por livro (30s) com erro graceful
**P4. Categorização automática por IA:**
- Ao importar, enviar título + autor + descrição à Anthropic
- Sugestão automática de categoria (Romance, Ficção Científica, Não-Ficção, etc.)
- Utilizador confirma ou altera — nunca categoriza sem confirmação
- Apenas se `aiProvider !== 'none'`
**P5. ElevenLabs TTS (premium):**
- `src/lib/tts/elevenlabs.ts` — cliente ElevenLabs API
- Cache de áudio por capítulo em IndexedDB (blob)
- Activado via API key nas Definições
- Fallback automático para Web Speech se sem key
**P6. Exportação avançada:**
- Exportar highlights para Obsidian (`.md` com formato `[[wikilinks]]`)
- Exportar para Notion via API
- Exportar para Anki (`.apkg` via API)
- Backup completo da biblioteca (ZIP: metadados + highlights + notas + flashcards, sem EPUBs)
**P7. Modo leitura offline total (PWA melhorado):**
- Pre-cache de EPUBs no service worker (opt-in por livro)
- Sincronização automática de progresso quando volta à rede
---
## 7. Regras de Comportamento (invioláveis)
1. **Lê antes de escrever.** Antes de modificar qualquer ficheiro existente, lê-o na íntegra.
2. **Commits atómicos.** Um commit = uma ideia. Nunca commitar trabalho parcial.
3. **Testa o que não é trivial.** SRS, sync, conflict resolution, parsing → testes obrigatórios.
4. **Sem dependências não aprovadas.** Se precisas de lib nova, pergunta antes de instalar.
5. **Sem optimização prematura.** Funcione primeiro. Performance na Fase 13.
6. **Sem silenciar erros.** `try/catch` apenas para erros esperados. Erros verdadeiros propagam.
7. **Sem API keys hardcoded.** Jamais. Lidas de `prefs.aiApiKey` ou env vars.
8. **Push sempre via `pat` remote.** O origin proxy retorna 403.
9. **Não toques em fases futuras.** Se estás na Fase 13, não implementas features da Fase 14.
10. **Segue os padrões da §5.** Cada um resolve um bug real documentado.
---
## 8. Configuração de Credenciais (setup manual pelo utilizador)
### 8.1 Supabase (para Fase 12)
1. Criar projecto em supabase.com
2. Executar `supabase/schema.sql` no SQL Editor
3. Em Settings > Sincronização: inserir URL e anon key
4. Clicar "Iniciar sessão" → magic link no email
### 8.2 Anthropic (para Fase 9)
1. Obter API key em console.anthropic.com
2. Em Settings > IA: activar toggle + inserir key
3. As queries de chat são enviadas à Anthropic. Os embeddings ficam locais.
### 8.3 GitHub remote (para push)
```bash
# O remote origin retorna 403. Usar pat:
git remote add pat https://ghp_TOKEN@github.com/bundaamarela/mkdir-cat-epub-cd-cat-epub-git-init.git
git push pat claude/read-claude-section-10-IioJn
```
---
## 9. Referências
- **Protótipo:** `_prototype/Cat Epub Reader.html` — referência visual e de design
- **foliate-js:** https://github.com/johnfactotum/foliate-js
- **Readest (arquitetura):** https://github.com/readest/readest
- **ts-fsrs:** https://github.com/open-spaced-repetition/ts-fsrs
- **Tauri 2:** https://v2.tauri.app
- **Dexie.js:** https://dexie.org
- **transformers.js:** https://huggingface.co/docs/transformers.js
- **EPUB CFI spec:** https://idpf.org/epub/linking/cfi/
- **WCAG contrast:** rácio mínimo 7:1 (AAA) para leitura prolongada
---
## 10. Comando de início de sessão
Ao iniciar uma nova sessão Claude Code, confirma primeiro:
1. "Li o CLAUDE.md v2.0 na íntegra."
2. "Estado actual: Fases 0–12 completas, 136 testes. Branch: `claude/read-claude-section-10-IioJn`."
3. "Próxima tarefa: [descreve o que vais fazer]."
Aguarda confirmação do utilizador antes de começar.
---
**Fim do documento mestre.**
> Versão 2.0 — Maio de 2026 · Para Kouran, solo founder
> Actualizado com: decisões reais de stack, bugs corrigidos, padrões estabelecidos, Fases 13–14
