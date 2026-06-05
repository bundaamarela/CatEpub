# CLAUDE.md — Cat Epub: Documento Mestre de Desenvolvimento
> **Versão:** 3.0 — Junho de 2026
> **Para:** Kouran, solo founder
> **Estado actual:** Fases 0–13 + Etapas A–F completas · 332 testes · build estável
>
> **Como usar:** Este ficheiro é lido pelo Claude Code no início de cada sessão. Contém o estado completo do projecto, decisões tomadas, padrões estabelecidos e fases futuras. Lê-o na íntegra antes de qualquer acção.
---
## 0. Contexto Estratégico
### 0.1 Quem é o utilizador
Solo founder a operar entre Moçambique, Angola e Portugal. Construtor de múltiplas plataformas (BizBlueprint, Baooba, Scaraab). Stack familiar: Next.js, Supabase, Stripe, Cursor, ambientes agentic. Esta aplicação é primariamente para **uso pessoal próprio** — não há roadmap comercial imediato, mas a arquitectura deve permitir extensão futura sem reescrita.
### 0.2 O que é o Cat Epub
Aplicação de leitura de ficheiros EPUB com identidade visual estabelecida ("Cat Epub" — gato como mascote), quatro temas tipográficos (claro, sépia, escuro, preto OLED) e foco extremo em minimalismo durante a leitura. Após as Etapas A–F, é também um **arsenal cognitivo**: backlinks bidireccionais, grafo de ideias semântico, conceitos, síntese cross-library, trilhos de leitura, detecção de contradições, exportação para Obsidian / Anki / CSV, sync soberana (Supabase OU WebDAV).
### 0.3 Princípios não-negociáveis
1. **Minimalismo durante a leitura.** Quando um livro está aberto, zero chrome por defeito.
2. **Personalização profunda.** Tipografia, espaçamento, margens, tema, paginação — tudo configurável.
3. **Offline-first.** A app funciona sem rede. Sync é opt-in e secundária.
4. **Cross-platform com codebase única.** Desktop via Tauri 2, mobile via PWA instalável.
5. **Performance.** EPUB de 5 MB abre em <1s. Mudar de página é instantâneo. Initial bundle <300 KB gzipped.
6. **Privacidade e soberania.** Dados ficam no dispositivo por defeito. Embeddings de IA nunca saem do device. WebDAV permite sync sob servidor próprio. `fileBlob`/`coverBlob` jamais saem do dispositivo, em qualquer provider.
### 0.4 O que NÃO construir
- ❌ Loja integrada de livros
- ❌ DRM proprietário
- ❌ Streaks, badges, gamificação social — psicologia predatória
- ❌ Recomendações algorítmicas
- ❌ Mais de 6 fontes ou 4 temas — paralisia de escolha
- ❌ Onboarding extenso — auto-evidente em 30 segundos
- ❌ Bionic Reading como default — evidência empírica contra uso universal
### 0.5 Estado actual do projecto (Junho 2026)
**Fases completas:** 0–13 (build de produção entregue)
**Etapas pós-MVP completas:** A (Library polish), B (Sovereignty), C (Knowledge), D (Cognitive depth), E (Portability), F (Final polish)
**Testes:** 332 unit + 3 e2e
**Branch activa:** `claude/read-claude-section-10-IioJn` (merged em `main` após F4)
**Remote funcional:** `pat` (`https://github.com/bundaamarela/CatEpub.git`); o `origin` proxy retorna 403 — usar sempre `git push pat`
**Próximo passo:** o arsenal está construído. Iteração futura é mantida ad-hoc, sem etapas pré-definidas.
---
## 1. Stack Técnico
### 1.1 Versões reais instaladas
| Camada | Versão instalada | Nota |
|---|---|---|
| React | **19** | Template Vite instalou 19 — compatível, manter |
| TypeScript | **6** | strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| Vite | **8** | Build via rolldown |
| Tauri | 2 | Conforme spec |
| Node.js | 20 LTS | Mínimo obrigatório |
| pnpm | 9+ | Não usar npm/yarn |
| Rust | 1.77+ | Para Tauri |
### 1.2 Dependências runtime (instaladas)
```
react-router-dom · zustand · dexie · @tanstack/react-query
ts-fsrs · ulid · date-fns · marked · dompurify · gray-matter · jszip
@xenova/transformers · @anthropic-ai/sdk · @supabase/supabase-js · d3
```
### 1.3 Dependências dev (instaladas)
```
vitest · @testing-library/react · @testing-library/jest-dom
@playwright/test · fake-indexeddb · eslint · prettier
vite-plugin-pwa · @tauri-apps/cli · @types/d3
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
## 2. Funcionalidades implementadas
### 2.1 Leitura
- Paginado / scroll, 4 temas (Claro / Sépia / Escuro / Preto OLED), 3 tipografias (Lora / Inter / Atkinson)
- Tap zones esquerda/direita 30% no mobile + tablet (paginated)
- Atalhos `←/→/Espaço/H/N/B/F/T/Esc` + bookmark + focus mode + check-ins de atenção
- Modo conectado de revisão (clusters de cards semanticamente relacionados)

### 2.2 Anotações & Conhecimento
- 5 cores de highlight, notas Markdown com frontmatter YAML (gray-matter)
- Wiki-links `[[...]]` com autocomplete no editor de notas
- Backlinks bidireccionais (Dexie v4 `backlinks` table)
- Grafo de ideias D3 force-directed com detecção de contradições (Anthropic)
- Conceitos (tag aggregation) com export `.md`
- Síntese cross-library (RAG top-K agrupado por livro)
- Trilhos de leitura (Dexie v5 `trailSteps` table — book→book influence map)

### 2.3 IA
- Anthropic SDK lazy-loaded (sk-ant-… user-owned)
- Embeddings locais Xenova/all-MiniLM-L6-v2 (~25 MB, lazy-import único)
- Definir / traduzir popover, RAG chat com citações clicáveis
- Categorização assistida por IA (sugere, nunca aplica sem confirmação)
- Detecção de contradições por par de highlights `argue` com similaridade ≥0.78

### 2.4 FSRS
- ts-fsrs 4.5, badge de vencidos na sidebar (polling 5min)
- Geração de flashcards via IA com dependency injection
- Modo conectado: card principal + até 3 cards relacionados por embeddings, prompt de síntese no fim do cluster

### 2.5 Biblioteca
- Importação multi-ficheiro com dedup SHA-256, conversão `pdf/docx/txt/html → epub` (Tauri, pandoc bundled)
- Scan + watch de pasta local (Tauri)
- Editor de metadados (título, autor, descrição, série, volume, tags, rating, capa custom — JPEG/PNG/WebP até 2 MB)
- Capas procedurais via `BookCover` (hsl + CatLogo) ou minimal generated (Python script)

### 2.6 Soberania de dados
- Exportação arsenal ZIP (notas + highlights + flashcards + metadados, opcional EPUBs)
- Exportação para **Obsidian** (vault ZIP com [[wikilinks]], frontmatter, _index.md, graph-data.json, backlinks)
- Exportação para **Anki** (TSV `front\tback\ttags`, namespaced `cat-epub::book::slug`)
- Exportação **CSV** de highlights (UTF-8 BOM para Excel, 8 colunas RFC-4180)
- Sync **Supabase** (magic-link, RLS) OU **WebDAV** (Nextcloud / qualquer RFC-4918), mutuamente exclusivos
- `fileBlob`/`coverBlob` **nunca** entram no payload de sync

### 2.7 TTS, PWA, Tauri
- Web Speech API pt-PT auto, boundary callbacks, pausa em chat
- PWA via vite-plugin-pwa (autoUpdate, workbox), instalável iOS/Android
- Tauri 2 builds: macOS .dmg, Windows .msi, Linux .AppImage/.deb

### 2.8 Polish (Etapa F)
- Frase diária no Home (rotação 8h, fallback hardcoded)
- Overlay de atalhos (`?` global) com 4 grupos: Global / Leitor / Conhecimento / Ficheiros
- Cmd/Ctrl+G → /graph; Cmd/Ctrl+Shift+S → /synthesis
- Initial bundle: **74.68 KB gzipped** (≈ 4× abaixo do budget de 300 KB)
- Empty states informativos em todos os routes
---
## 3. Estrutura de Directórios (estado real)
```
cat-epub/
├── CLAUDE.md
├── README.md
├── _prototype/                        # Referência visual — NÃO editar
├── vendor/foliate-js/                 # git submodule
├── supabase/schema.sql
├── scripts/
│   ├── generate_covers.py             # Pillow — gera covers minimalistas
│   └── README.md
├── public/
│   ├── manifest.webmanifest
│   └── quotes.json                    # Frase diária (rotação 8h)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── index.tsx                  # createBrowserRouter (lazy)
│   │   ├── RootLayout.tsx             # Sidebar/MobileNav + ShortcutsOverlay
│   │   ├── home.tsx                   # Welcome + QuoteBlock + Stats + Continue/Recent
│   │   ├── library.tsx                # Grid/list + drag import + filtros
│   │   ├── reader.tsx                 # Tap zones mobile + foliate-js + painéis
│   │   ├── search.tsx                 # Cmd+K
│   │   ├── notes.tsx                  # Filtros + edição + backlinks "Referenciado por"
│   │   ├── review.tsx                 # FSRS daily + modo conectado + síntese de cluster
│   │   ├── graph.tsx                  # D3 force-directed + contradições
│   │   ├── concepts.tsx               # Tag cloud + detalhe + export
│   │   ├── synthesis.tsx              # Cross-library RAG + tensões ⚡
│   │   ├── trails.tsx                 # Timeline hoje + book-to-book map
│   │   └── settings.tsx               # Tema/Fontes/IA/TTS/Sync/Soberania/Lib/Atalhos
│   ├── components/
│   │   ├── shared/{Toast,WikiLinkEditor,ShortcutsOverlay,…}
│   │   ├── reader/{ReaderSurface,ReaderTopBar,HighlightToolbar,Panel*,AiPopover}
│   │   ├── library/{BookCover,BookCard,BookGrid,BookList,ImportDropzone,FilterBar,MetadataEditor}
│   │   ├── home/{Greeting,StatsBlock,ContinueReading,RecentlyRead,Welcome,QuoteBlock}
│   │   ├── settings/{LibraryFolderSection,SyncSection}
│   │   └── nav/{Sidebar,MobileNav,MobileTopBar,nav-items}
│   ├── lib/
│   │   ├── epub/{parser,renderer,pagination,search}
│   │   ├── db/{schema (v5),books,highlights,notes,flashcards,sessions,embeddings,backlinks,trails}
│   │   ├── store/{prefs,library,highlights,prefs-storage}
│   │   ├── srs/{scheduler,card-generator,useDueCount}
│   │   ├── ai/{client,rag,embeddings,prompts,synthesis,chunker}
│   │   ├── knowledge/{backlinks,persist-backlinks,graph,concepts,contradictions,trails,export,markdown}
│   │   ├── library/{cover-validation}
│   │   ├── notes/{export}
│   │   ├── tauri/{library-scan,convert}
│   │   ├── tts/{webspeech}
│   │   ├── sync/{supabase,webdav,queue,useSyncTrigger,conflict}
│   │   ├── quotes/{quotes}
│   │   ├── theme/{tokens,apply,colors,useAutoTheme}
│   │   └── utils/{cn,date,debounce,id,markdown,useBreakpoint,bionic}
│   ├── types/{book,highlight,note,prefs,flashcard,backlink,trail,sync,embedding,foliate-js.d.ts}
│   ├── styles/{globals,themes,reader}
│   └── assets/fonts/                  # Pixelify Sans, Lora, Inter, Atkinson
├── src-tauri/
└── tests/
    ├── unit/  (35 ficheiros, 332 testes)
    └── e2e/   (Playwright — 3 specs)
```
---
## 4. Sistema de Design
Mantém-se inalterado face à v2.0. Ver §3.1–3.3 da v2.0 para tokens e tipografia. Adições:
- `useIsSmallScreen()` em `src/lib/utils/useBreakpoint.ts` para gates de features pesadas (<640 px)
- Breakpoint compacto bumped de 768 → 1024 px (tablets usam hamburger + bottom nav)
---
## 5. Padrões Estabelecidos
> Esta secção é crítica. Cada padrão resolveu um bug real. Segue-os sem questionar.
### 5.1 Zustand com useShallow OBRIGATÓRIO
```tsx
// ❌ ERRADO — cria novo objecto a cada render → loop infinito
const { fontSize, lineHeight } = usePrefs(s => ({ fontSize: s.fontSize, lineHeight: s.lineHeight }));
// ✅ CORRECTO
import { useShallow } from 'zustand/react/shallow';
const { fontSize, lineHeight } = usePrefs(useShallow(s => ({ fontSize: s.fontSize, lineHeight: s.lineHeight })));
```
### 5.2 TanStack Query 5 — queryFn não pode retornar undefined
```ts
queryFn: () => positions.getById(bookId).then(p => p ?? null)
```
### 5.3 foliate-js — view.init() requer argumento obrigatório
```ts
await view.init(startCfi ? { lastLocation: startCfi } : {});
```
### 5.4 useBreakpoint — usar useSyncExternalStore
Nunca `useState + useEffect` para media queries (viola `react-hooks/set-state-in-effect`).
### 5.5 CSS Modules com noUncheckedIndexedAccess
Sempre `cn(styles.foo)` — `styles.foo` é `string | undefined`.
### 5.6 exactOptionalPropertyTypes — props opcionais
```tsx
// ✅ conditional spread
<Component {...(value !== undefined ? { key: value } : {})} />
```
### 5.7 Refs do renderer — nunca ler durante render
Passar getter `() => rendererRef.current` em vez de `rendererRef.current`.
### 5.8 PanelSearch dentro de PanelOverlay com `noPadding`
### 5.9 foliate-js shadow DOM fechado
Testes e2e validam via IndexedDB, não via conteúdo do iframe.
### 5.10 Push para GitHub via remote `pat`
```bash
git push pat <branch>   # origin proxy retorna 403
```
O remote `pat` aponta para `https://github.com/bundaamarela/CatEpub.git`.
### 5.11 Vitest — excluir testes e2e em `vite.config.ts`
### 5.12 Dynamic import para libs pesadas
```ts
// transformers.js (~25 MB) lazy
const transformers = await import('@xenova/transformers');

// Anthropic SDK em rotas lazy — Vite split automático
// d3 idem (graph route é lazy)
```
### 5.13 `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks 7.x)
Não chamar `setState` síncrono dentro de `useEffect`. Usar:
- `queueMicrotask(() => setState(…))` quando necessário
- Computação button-triggered em vez de effect-triggered
- Callback-based patterns que aceitam estado actual
### 5.14 Stop hook "Unverified" — falso positivo conhecido
Os commits **já usam** `noreply@anthropic.com` (verificável via GitHub API). O `N` vem de um ficheiro `commit_signing_key.pub` vazio no ambiente — não tomar acção.
### 5.15 BOM em CSVs — `Blob.text()` strip por defeito
Para verificar BOM em testes, ler `await blob.arrayBuffer()` e validar bytes `EF BB BF`.
### 5.16 Stripping `fileBlob` em sync
Tanto Supabase como WebDAV pipelines devem chamar `stripBookBlobs(b)` antes de qualquer push. Os testes garantem que o payload **nunca** contém `fileBlob` nem `coverBlob`.
### 5.17 Lazy routes + Suspense com PageSkeleton
Todas as rotas excepto `home` são `lazy(() => import('./X'))` no router.
---
## 6. Fases / Etapas — registo histórico
### Fases 0–13 (MVP)
- 0 Bootstrap · 1 Design system · 2 Layout/nav · 3 Dexie · 4 EPUB renderer · 5 Home/Library · 6 Anotações · 7 Modos de leitura · 8 Pesquisa/TOC · 9 IA (RAG) · 10 FSRS · 11 Métricas/TTS · 12 Sync Supabase · 13 Polish/PWA/Tauri
### Etapa A — Library Polish
- A1 Metadata editor (`d154ea4`)
- A2 Folder scan + watch (`89418ce`)
- A3 Format conversion to EPUB (`7064ff8`)
- A4 AI-assisted categorisation (`589cd0a`)
### Etapa B — Sovereignty I
- B1 Markdown-native notes with frontmatter (`cd3a9f2`)
- B2 Full arsenal export (`cf034ce`)
### Etapa C — Knowledge Layer
- C1 Bidirectional backlinks (`5f34952`) — Dexie v4
- C2 Idea graph D3 (`cd6fbf4`)
- C3 Concept pages (`37c3845`)
- C4 Cross-library synthesis (`6f2be7c`)
### Etapa D — Cognitive Depth
- D1 Contradiction detection (`9f340a8`)
- D2 Reading trails (`90da297`) — Dexie v5
- D3 Connected review (`fb46bdb`)
### Etapa E — Portability and Durability
- E1 Mobile/tablet responsive (`e89e9d4`)
- E2 Advanced export targets — Obsidian/Anki/CSV (`b3db3ab`)
- E3 WebDAV sync (`406e506`)
### Etapa F — Final Polish
- F1 Performance (`a3060ec`) — initial 74.68 KB gzipped
- F2 Shortcuts overlay + Cmd+G + Cmd+Shift+S (`169ddb4`)
- F3 Empty states (`b986f86`)
- F4 Docs v3.0 + merge to main (este commit)
### Extras
- Periodic quotes Home (`81d98f4`)
- Generated covers Python script (`76da204`)
---
## 7. Regras de Comportamento (invioláveis)
1. **Lê antes de escrever.** Antes de modificar qualquer ficheiro existente, lê-o na íntegra.
2. **Commits atómicos.** Um commit = uma ideia.
3. **Testa o que não é trivial.**
4. **Sem dependências não aprovadas.**
5. **Sem optimização prematura.**
6. **Sem silenciar erros.**
7. **Sem API keys hardcoded.** Lidas de `prefs.aiApiKey` ou env vars.
8. **Push sempre via `pat` remote.**
9. **Segue os padrões da §5.**
10. **`fileBlob`/`coverBlob` jamais saem do dispositivo — em qualquer provider de sync.**
---
## 8. Configuração de Credenciais
### 8.1 Supabase
1. Criar projecto em supabase.com
2. Executar `supabase/schema.sql` no SQL Editor
3. Em Settings > Sincronização: provider = Supabase, inserir URL + anon key
4. "Iniciar sessão" → magic link
### 8.2 WebDAV (Nextcloud, ownCloud, etc.)
1. Em Nextcloud: gerar "App password" (Settings > Security)
2. Em Settings > Sincronização: provider = WebDAV
3. URL base (ex.: `https://cloud.exemplo.com/remote.php/dav/files/utilizador`)
4. "Testar ligação" → verifica via PROPFIND
### 8.3 Anthropic
1. Obter API key em console.anthropic.com
2. Settings > IA: activar toggle + inserir key (`sk-ant-…`)
3. Chat envia queries à Anthropic. Embeddings ficam locais (Xenova/all-MiniLM-L6-v2).
### 8.4 GitHub remote
```bash
# pat → bundaamarela/CatEpub (correcto)
# origin → proxy 403, usar apenas para refs locais
git push pat <branch>
```
---
## 9. Referências
- **Protótipo:** `_prototype/Cat Epub Reader.html`
- **foliate-js:** https://github.com/johnfactotum/foliate-js
- **Readest:** https://github.com/readest/readest
- **ts-fsrs:** https://github.com/open-spaced-repetition/ts-fsrs
- **Tauri 2:** https://v2.tauri.app
- **Dexie.js:** https://dexie.org
- **transformers.js:** https://huggingface.co/docs/transformers.js
- **EPUB CFI spec:** https://idpf.org/epub/linking/cfi/
- **WCAG contrast:** rácio mínimo 7:1 (AAA)
---
## 10. Comando de início de sessão
Ao iniciar uma nova sessão Claude Code, confirma primeiro:
1. "Li o CLAUDE.md v3.0 na íntegra."
2. "Estado actual: Fases 0–13 + Etapas A–F completas. 332 testes. Branch principal: `main`."
3. "Próxima tarefa: [descreve o que vais fazer]."
Aguarda confirmação do utilizador antes de começar.
---
**Fim do documento mestre v3.0.**
> Junho de 2026 · Para Kouran, solo founder
> O arsenal está construído. 🏛️
