# Cat Epub

Leitor de EPUB minimalista, offline-first, com sincronização opcional (Supabase OU WebDAV), IA local + Anthropic, TTS pt-PT, FSRS, e um arsenal completo de ferramentas de conhecimento: backlinks bidireccionais, grafo de ideias, conceitos, síntese cross-library, trilhos de leitura e detecção de contradições.

> Estado: Fases 0–13 + Etapas A–F completas · 332 testes · build estável.

---

## Screenshots

> Substitui os placeholders por capturas reais. As dimensões sugeridas são 1280×800 para desktop e 375×812 para mobile.

| | |
|---|---|
| [Screenshot: Home — Greeting + Stats + QuoteBlock + Continue Reading] | [Screenshot: Library — grid view com filtros e capas] |
| [Screenshot: Reader — modo paginado com TopBar e HighlightToolbar] | [Screenshot: Reader Focus Mode — zero chrome] |
| [Screenshot: Graph — D3 force-directed com edges semânticos] | [Screenshot: Synthesis — resposta + tensões + fontes] |
| [Screenshot: Trails — timeline de hoje + mapa de influências] | [Screenshot: Settings — Soberania de Dados expandida] |
| [Screenshot: Notes — wikilinks + backlinks "Referenciado por"] | [Screenshot: Shortcuts Overlay — `?` global] |

---

## Funcionalidades

### Leitura
- **4 temas** — Claro, Sépia, Escuro, Preto OLED
- **3 tipografias** — Lora (serif), Inter (sans), Atkinson Hyperlegible (dyslexia-friendly)
- **Paginação configurável** — paginado ou scroll, tamanho/entrelinhamento/largura ajustáveis
- **Modo foco** — zero chrome durante a leitura
- **Tap zones** — esquerda/direita 30% no mobile + tablet (paginated)
- **Bionic Reading** opcional (com aviso experimental)
- **Check-ins de atenção** opcionais

### Anotações
- 5 cores de highlight, notas Markdown com **frontmatter YAML**
- Wiki-links `[[…]]` com autocomplete
- Backlinks bidireccionais (secção "Referenciado por")
- Marcadores, tags hierárquicas

### Conhecimento
- **Grafo de ideias** D3 force-directed (cross-book embeddings)
- **Conceitos** — tag-cloud agregando highlights/notas com export `.md`
- **Síntese cross-library** — pergunta cruza todos os livros, devolve resposta + tensões detectadas + fontes clicáveis
- **Trilhos de leitura** — timeline de hoje + mapa book→book de influências
- **Detecção de contradições** — IA avalia pares de highlights `argue` semanticamente próximos

### IA
- Anthropic (chat, definir, traduzir, gerar flashcards, síntese, categorização, contradições)
- Embeddings locais (Xenova/all-MiniLM-L6-v2 — ~25 MB, lazy-loaded)
- `dangerouslyAllowBrowser` para uso pessoal — a API key é do utilizador

### Revisão espaçada
- FSRS-4.5 (ts-fsrs)
- Geração de flashcards manual ou por IA
- Badge de cards vencidos na sidebar
- **Modo conectado** — card principal expande para cluster de até 4 cards de livros relacionados, com prompt de síntese no fim

### TTS
- Web Speech API pt-PT auto-detectado
- Velocidade configurável, escolha de voz
- Boundary callbacks → highlight da posição em leitura

### Biblioteca
- Importação multi-ficheiro com dedup SHA-256
- Conversão `pdf/docx/txt/html → epub` (Tauri, pandoc bundled)
- Scan + watch de pasta local (Tauri)
- **Editor de metadados** — título, autor, descrição, série, volume, tags, rating, capa custom
- Capas procedurais (hsl + CatLogo) ou geradas via script Python

### Soberania de Dados
- **Export arsenal** ZIP completo (notas + highlights + flashcards + metadados; EPUBs opcionais)
- **Export Obsidian** vault (wikilinks resolvidos, `_index.md` por livro, `graph-data.json`)
- **Export Anki** TSV (`front\tback\ttags`, namespaced `cat-epub::book::slug`)
- **Export CSV** highlights (UTF-8 BOM, 8 colunas para Excel)
- **Sync Supabase** OU **WebDAV/Nextcloud** (mutuamente exclusivos)
- `fileBlob`/`coverBlob` **nunca** saem do dispositivo, em qualquer provider

### Polish
- Frase diária no Home com rotação 8 h (`public/quotes.json`)
- Overlay de atalhos (`?` global)
- Cmd/Ctrl + G → Grafo · Cmd/Ctrl + Shift + S → Síntese
- Empty states informativos em todos os routes

### PWA / Tauri
- Instalável em iOS Safari e Android Chrome (autoUpdate via vite-plugin-pwa)
- Desktop builds via Tauri 2 — macOS `.dmg`, Windows `.msi`, Linux `.AppImage`/`.deb`

---

## Instalação

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20 LTS |
| pnpm | 9+ |
| Rust | 1.77+ (só para Tauri) |
| Python | 3.9+ (só para `generate_covers.py`) |

### PWA (browser)

```bash
git clone --recurse-submodules https://github.com/bundaamarela/CatEpub.git cat-epub
cd cat-epub
pnpm install
pnpm dev
# Abre http://localhost:5173
```

Produção (serve `dist/` com qualquer servidor estático):

```bash
pnpm build
```

### App desktop (Tauri 2)

```bash
pnpm tauri dev     # desenvolvimento
pnpm tauri build   # gera .dmg / .msi / .AppImage / .deb
```

O bundle identifier é `com.kouran.catepub`. Os builds Tauri incluem acesso à filesystem para o scan + watch da pasta de livros.

---

## Configuração

### IA — Anthropic

1. Obtém uma API key em [console.anthropic.com](https://console.anthropic.com)
2. **Definições › IA**: activa o toggle e cola a key (`sk-ant-…`)
3. As queries de chat/síntese/contradições são enviadas à Anthropic. Os **embeddings ficam no dispositivo**.

### Sincronização — Supabase (cloud)

1. Cria um projecto em [supabase.com](https://supabase.com)
2. Executa `supabase/schema.sql` no SQL Editor
3. **Definições › Sincronização**: provider **Supabase**, cola URL + anon key
4. Clica **Iniciar sessão** → magic link no email
5. **Sincronizar agora** para o primeiro sync

### Sincronização — WebDAV (soberano, ex.: Nextcloud)

1. No Nextcloud: **Settings › Security › Devices & sessions** → cria uma **App password**
2. **Definições › Sincronização**: provider **WebDAV / Nextcloud**
3. URL base (ex.: `https://cloud.exemplo.com/remote.php/dav/files/utilizador`), utilizador, app password
4. **Testar ligação** verifica via `PROPFIND`
5. Os ficheiros são guardados em `cat-epub/*.json` no servidor

> Apenas um provider activo em simultâneo. Mudar o provider pausa o outro automaticamente.

### Biblioteca Imperial (pasta local — só Tauri)

1. **Definições › Biblioteca local**: clica **Escolher pasta**
2. A app analisa a pasta e subpastas em busca de `.epub`
3. Novos ficheiros são detectados automaticamente e importados
4. Conversão de `.pdf/.docx/.txt/.html` é automática se `pandoc` estiver disponível

---

## Atalhos de teclado

### Global

| Atalho | Acção |
|---|---|
| `Cmd/Ctrl+K` | Pesquisa global |
| `Cmd/Ctrl+,` | Definições |
| `Cmd/Ctrl+B` | Mostrar / recolher barra lateral |
| `Cmd/Ctrl+G` | Grafo de ideias |
| `Cmd/Ctrl+Shift+S` | Síntese cross-library |
| `?` | Abrir / fechar overlay de atalhos |
| `Esc` | Fechar painéis / cancelar selecção |

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

### Conhecimento

| Gesto | Acção |
|---|---|
| Duplo clique num nó do grafo | Abrir no leitor |
| Clique numa citação da síntese | Navegar para a fonte |
| `[[ Texto ]]` numa nota | Criar wiki-link |

### Ficheiros

| Gesto | Acção |
|---|---|
| Arrastar `.epub` | Importar para a biblioteca |
| `···` no cartão do livro | Editar metadados |
| Arrastar imagem para o campo de capa | Definir capa custom |

---

## `scripts/generate_covers.py` — Capas minimalistas

Script Python standalone (apenas Pillow). Gera capas PNG limpas (light + dark) para livros sem cover utilizável.

```bash
pip install Pillow
cd scripts
# 1) Cria covers_input.json:
#    [{ "id": "01HXY...", "title": "Muqaddimah", "author": "Ibn Khaldun" }, …]
python generate_covers.py
# 2) Output em scripts/covers_output/:
#    {id}_light.png  (400×600, fundo claro)
#    {id}_dark.png   (400×600, fundo escuro)
```

Importa o PNG escolhido via **Biblioteca › ⋯ › Editar metadados › Carregar capa**. O cover field aceita PNG/JPEG/WebP até 2 MB.

Layout: título centrado em cima (auto-wrap, font shrink), regra horizontal fina, autor em baixo.

Ver `scripts/README.md` para o detalhe completo.

---

## `public/quotes.json` — Frase diária

A Home mostra uma frase de autor que roda a cada **8 horas** (seed determinístico — toda a gente vê a mesma frase na mesma janela). Edita `public/quotes.json` para a tua colecção pessoal:

```json
[
  {
    "text": "A leitura faz o homem completo; a conversação fá-lo expedito; a escrita exacto.",
    "author": "John Locke",
    "source": "Of the Conduct of the Understanding"
  },
  {
    "text": "Toda a guerra é baseada na decepção.",
    "author": "Sun Tzu",
    "source": "A Arte da Guerra"
  }
]
```

Campos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| `text` | string | sim |
| `author` | string | sim |
| `source` | string | opcional |

Se o ficheiro estiver ausente, vazio ou mal-formado, é usado um fallback hardcoded de 5 frases (Montaigne, Séneca, Locke, Marco Aurélio, Ibn Khaldun). Podes desligar a frase em **Definições › Início › Mostrar frase diária**.

---

## Arquitectura técnica

```
src/
├── routes/           # React Router (lazy) — 13 routes
├── components/       # shared/, reader/, library/, home/, settings/, nav/
├── lib/
│   ├── db/           # Dexie v5 — books, highlights, notes, flashcards,
│   │                 #            bookmarks, sessions, embeddings,
│   │                 #            syncQueue, backlinks, trailSteps
│   ├── store/        # Zustand (persistido em Dexie)
│   ├── epub/         # foliate-js wrapper
│   ├── ai/           # Anthropic, embeddings, RAG, synthesis, chunker
│   ├── srs/          # FSRS-4.5 scheduler + card generator
│   ├── knowledge/    # backlinks, graph, concepts, contradictions, trails, export
│   ├── sync/         # Supabase + WebDAV + offline queue
│   ├── tts/          # Web Speech
│   ├── quotes/       # 8h period quote rotation
│   └── theme/        # 4 temas CSS + auto-schedule
├── types/            # TypeScript interfaces (strict + exactOptionalPropertyTypes)
└── styles/           # CSS variables only (sem Tailwind)

src-tauri/            # Tauri 2 commands (scan, watch, convert)
vendor/foliate-js/    # git submodule
supabase/schema.sql   # 7 tabelas + RLS
scripts/              # generate_covers.py + README
public/               # quotes.json, manifest, icons
tests/
├── unit/  (35 ficheiros, 332 testes Vitest)
└── e2e/   (Playwright — import/read/highlight, temas, FSRS)
```

**Stack:** React 19 · TypeScript 6 (strict) · Vite 8 · Dexie v5 · Zustand · TanStack Query · ts-fsrs · foliate-js · D3 · @xenova/transformers · Anthropic SDK · Supabase · Tauri 2 · vite-plugin-pwa

**Bundle inicial:** 74.68 KB gzipped (4× abaixo do budget de 300 KB).

---

## Desenvolvimento

```bash
pnpm dev          # servidor de desenvolvimento
pnpm typecheck    # tsc -b --noEmit (strict)
pnpm lint         # ESLint (eslint-plugin-react-hooks 7.x)
pnpm test --run   # Vitest — 332 testes
pnpm test:e2e     # Playwright (requer servidor a correr)
pnpm build        # Vite build + PWA service worker
```

---

## Licença

MIT — © 2026 Kouran
