# Cat Epub como Arsenal Cognitivo
## Visão Arquitectónica de Longo Prazo

> **Documento estratégico — não é um prompt de execução.**
> Define o norte que orienta toda a construção futura: o que edificar, por que ordem, e o que recusar para não comprometer a soberania e a durabilidade.
>
> Centro de gravidade: **conhecimento** — ler para conectar ideias entre livros e construir uma estrutura de pensamento que se compõe ao longo do tempo.
>
> Versão 1.0 · Maio de 2026 · Para Kouran

---

## I. A Tese Central

Há uma decisão filosófica que precede todas as decisões técnicas, e a maioria das aplicações de leitura nunca a toma conscientemente.

**A unidade atómica do Cat Epub não é o livro. É a ideia.**

O livro é um contentor — um meio de transporte de ideias, organizado pela ordem de exposição que o autor escolheu, não pela ordem de relevância para ti. Quando lês para construir conhecimento, o valor não está em "ter lido o livro". Está em extrair as ideias, libertá-las do contentor, e conectá-las a outras ideias que já extraíste de outros contentores.

Disto decorre tudo. Uma app que trata o livro como unidade atómica organiza por estante, capa, progresso, autor. Útil, mas é uma biblioteca — um arquivo morto. Uma app que trata a ideia como unidade atómica organiza por conceito, conexão, contradição, genealogia. Isso é um arsenal — um sistema vivo onde cada livro novo que lês torna os livros antigos mais valiosos, porque cria novas conexões.

O Cat Epub que tens hoje é uma biblioteca excelente. O Cat Epub que vais construir é um arsenal. A diferença entre os dois é uma única camada: **a camada de conhecimento**, onde as ideias deixam de viver presas ao livro de origem e passam a viver numa rede.

---

## II. A Linhagem em que te Inscreves

Não estás a inventar isto. Estás a digitalizar uma prática com 500 anos, que produziu boa parte do pensamento ocidental sério. Conhecer a linhagem importa, porque cada uma destas tradições resolveu um problema que vais enfrentar.

### O Commonplace Book (Renascença → Locke, séc. XVII)
Os eruditos do Renascimento mantinham um *commonplace book*: um caderno onde copiavam extractos das suas leituras, organizados por tópico — não pela ordem dos livros, mas por tema. Quando precisavam de pensar sobre "virtude" ou "poder", iam à entrada respectiva e tinham ali, lado a lado, o que Séneca, Maquiavel e Tácito disseram sobre o assunto.

John Locke — o autor que estavas a ler — formalizou um método de indexação para estes cadernos. O problema que ele resolveu: como encontrar de novo um extracto entre milhares. A sua solução foi um índice por primeira letra do tópico e primeira vogal. Tu tens uma solução infinitamente superior — busca full-text e similaridade semântica. Mas o **princípio** de Locke é o teu princípio: o extracto organizado por tema vale mais do que o livro lido.

### O Zettelkasten (Niklas Luhmann, séc. XX)
O sociólogo alemão Niklas Luhmann produziu mais de 70 livros e 400 artigos numa vida. O seu segredo era uma caixa de fichas — o *Zettelkasten*: 90.000 notas atómicas, cada uma com uma única ideia, cada uma ligada a outras por referências cruzadas. Luhmann dizia que não pensava sozinho — pensava em diálogo com a sua caixa. A estrutura não era imposta de cima; **emergia das conexões**. Padrões de pensamento que ele não tinha planeado revelavam-se à medida que a rede crescia.

O princípio de Luhmann é o segundo pilar do teu arsenal: **a nota atómica, conectada, gera conhecimento emergente**. Não basta guardar. As conexões entre o que guardas são onde o pensamento novo nasce.

### A síntese que o Cat Epub permite e que mais nada faz bem
Hoje, quem segue estas práticas usa duas ferramentas separadas: lê num sítio (Kindle, app de leitura) e pensa noutro (Obsidian, Roam, Logseq). Há uma fronteira — exportar, copiar, reconciliar. Essa fronteira é onde as ideias morrem, porque a fricção desencoraja a extracção.

O Cat Epub tem uma vantagem estrutural única: **funde a camada de leitura com a camada de conhecimento num único sistema soberano e local**. Lês e conectas no mesmo lugar. O highlight não é só um destaque — é uma nota atómica que entra imediatamente na rede. Não há exportação, não há fronteira, não há fricção. Esta é a tua proposta de valor real, e é a razão pela qual vale a pena construir isto em vez de usar o que já existe.

---

## III. Os Três Eixos da Durabilidade

Pediste algo que não se torne obsoleto. A obsolescência tem causas identificáveis, e cada uma tem um antídoto arquitectónico.

### Eixo 1 — Conhecimento (o motor)
É o que torna o sistema valioso e crescente. Sem isto, é uma biblioteca. Detalhado na Secção IV.

### Eixo 2 — Soberania de dados (o antídoto à obsolescência)
Uma app morre quando os teus dados morrem com ela. O antídoto é simples e inviolável:

**Tudo o que produzes vive em formatos abertos e legíveis daqui a 20 anos.**
- Highlights, notas, conexões → **Markdown puro + JSON**. Abríveis em qualquer editor de texto, hoje e em 2046.
- Base de dados → **SQLite** (via Tauri) ou IndexedDB exportável. Formato documentado, universal, eterno.
- Os teus EPUBs → ficam intactos na Biblioteca Imperial. A app nunca os altera.

O teste decisivo: *se o Cat Epub desaparecesse amanhã, perderias alguma coisa?* A resposta tem de ser **não** — porque os teus dados estão em ficheiros que abres sem o Cat Epub. A app é a interface; os dados são teus, independentes dela.

### Eixo 3 — Camadas substituíveis (o antídoto à dependência)
Cada tecnologia externa de que dependes vai mudar ou morrer. A IA hoje é a Anthropic; daqui a três anos pode ser local, ou outra. O motor de leitura é o foliate-js. O TTS é a Web Speech API.

A regra: **cada uma destas é uma camada substituível, nunca uma fundação.** O código tem de isolar cada dependência atrás de uma interface própria, de modo que trocar o fornecedor de IA seja mudar um ficheiro, não reescrever a app. Isto já está parcialmente feito (o `client.ts` da IA isola a Anthropic). O princípio deve estender-se a tudo: IA, TTS, embeddings, sync.

### Eixo 4 (implícito) — Portabilidade soberana
A mesma biblioteca, os mesmos dados, em qualquer dispositivo que tenhas. Detalhado na Secção VI.

---

## IV. A Camada de Conhecimento — O Que Falta Construir

Esta é a secção que importa. Ordenada por impacto para um investigador, não por facilidade de implementação. Cada item transforma o Cat Epub de biblioteca em arsenal.

### 1. O Grafo de Ideias (a feature definidora)
**O que é:** cada highlight e cada nota tornam-se nós. As conexões entre eles — por similaridade semântica (automática, via os embeddings que já tens) e por ligação manual (que tu crias) — tornam-se arestas. O resultado é uma rede navegável de tudo o que extraíste, atravessando todos os livros.

**Por que importa:** é o mecanismo de Luhmann. Quando destacas uma passagem sobre "poder" em Maquiavel, o sistema mostra-te imediatamente o que destacaste sobre poder em Sun Tzu, em Foucault, em Hobbes. As ideias deixam de viver presas ao livro. Vês a conversa entre autores que nunca se leram.

**Como:** vector store local (já tens transformers.js a gerar embeddings). Similaridade por cosseno acima de um limiar. Visualização em grafo (D3.js no desktop) mais — e isto é o mais importante — sugestões laterais durante a leitura: "Ideias relacionadas na tua biblioteca."

### 2. Síntese Inter-livros (RAG sobre toda a biblioteca)
**O que é:** hoje o teu chat de IA responde com base num livro. Esta feature estende o RAG a toda a biblioteca. Perguntas "o que diz a minha biblioteca sobre a natureza do poder?" e o sistema puxa passagens de todos os livros que tocam o tema, e sintetiza.

**Por que importa:** transforma a tua biblioteca numa entidade consultável. Não lês um livro para encontrar uma resposta — interrogas tudo o que já leste de uma vez. É a diferença entre uma estante e um oráculo.

**Como:** embeddings de todos os livros já existem (Fase 9). Falta a camada de retrieval cross-book e um painel de síntese dedicado, separado do chat por-livro.

### 3. Páginas de Conceito (o commonplace book automático)
**O que é:** páginas geradas automaticamente, uma por conceito recorrente. A página "Estratégia" agrega todos os highlights e notas de toda a biblioteca que tocam estratégia, com a fonte de cada um. Construída a partir das tuas tags e da extracção semântica.

**Por que importa:** é exactamente o commonplace book de Locke, mas construído sozinho. Quando queres pensar sobre um tema, tens numa página tudo o que já extraíste sobre ele, de todos os livros, organizado por relevância. A tua enciclopédia pessoal, escrita pelas tuas próprias leituras.

**Como:** agregação por tag hierárquica (já tens `estratégia/jogos/poker`) + clustering semântico opcional via IA. Página dinâmica que se actualiza à medida que destacas.

### 4. Backlinks Bidireccionais (a malha de Luhmann)
**O que é:** qualquer nota pode ligar-se a outra. A ligação é bidireccional — se a nota A referencia a nota B, a nota B mostra que é referenciada por A. Como no Obsidian e no Roam.

**Por que importa:** é o tecido conectivo do conhecimento. As notas deixam de ser uma lista e tornam-se uma malha. O pensamento novo nasce quando vês que duas notas que escreveste em meses diferentes, sobre livros diferentes, estão a dizer a mesma coisa — ou a contradizer-se.

**Como:** sintaxe de ligação nas notas markdown (`[[título da nota]]`). Índice de backlinks computado. Já tens o markdown; falta o parsing de ligações e o índice reverso.

### 5. Trilhos de Leitura (genealogia intelectual)
**O que é:** o sistema regista o percurso das ideias. Este highlight em Locke levou-te a procurar Hume. Esta nota gerou aquela pergunta que te fez abrir um terceiro livro. O trilho da tua investigação fica visível.

**Por que importa:** o conhecimento sério não é linear. Saber *como* chegaste a uma ideia — que leituras a geraram — é tão valioso como a ideia. Permite reconstruir o teu próprio raciocínio meses depois.

**Como:** registo leve de navegação entre nós do grafo + timestamps. Visualização opcional como linha temporal de ideias.

### 6. Detecção de Contradições e Tensões
**O que é:** a IA marca passagens, dentro de um livro ou entre livros, onde há tensão argumentativa — onde um autor parece contradizer-se, ou onde dois autores que destacaste discordam frontalmente.

**Por que importa:** o pensamento afia-se no choque de ideias contrárias, não na sua acumulação. Um arsenal que te mostra onde as tuas fontes colidem força-te a resolver a tensão — que é onde o pensamento próprio nasce. As cinco cores semânticas que já tens (facto/argumento/conceito/pergunta/citação) são a matéria-prima para isto.

**Como:** comparação semântica de passagens com a tag "argumento" + prompt de IA orientado a detectar oposição. Computado on-demand, nunca automático (custa tokens).

### 7. Revisão Espaçada Conectada
**O que é:** o FSRS que já tens revê flashcards isolados. Esta evolução revê *clusters* de ideias conectadas — não "o que disse Locke sobre X", mas "como se relacionam as ideias de Locke, Hume e Kant sobre X".

**Por que importa:** retém-se melhor o que está conectado. Rever ideias na sua rede, não isoladas, consolida a estrutura, não apenas os factos.

**Como:** extensão do scheduler FSRS para operar sobre grupos de nós do grafo, não apenas cartões individuais.

---

## V. Durabilidade Técnica — O Que Torna Isto À Prova de Futuro

Para além da soberania de dados (Secção III), há decisões de engenharia que determinam se o sistema sobrevive a uma década.

**Formato de notas: Markdown com frontmatter.** Cada nota é um ficheiro `.md` com metadados YAML no topo (tags, ligações, fonte, data). É o formato do Obsidian, do Logseq, de toda a comunidade de conhecimento pessoal. Se um dia abandonares o Cat Epub, abres tudo no Obsidian sem perder nada. Esta compatibilidade não é conveniência — é seguro de vida para o teu conhecimento.

**Base de dados exportável a qualquer momento.** Um botão "Exportar arsenal completo" que gera um ZIP: todos os EPUBs (opcional), todas as notas em `.md`, todos os highlights em JSON, todos os flashcards, o grafo de conexões em formato aberto. Backup que abres em qualquer máquina.

**Embeddings locais, sempre.** Já decidido, mas reforço o princípio: os teus embeddings — a representação matemática do teu conhecimento — nunca saem do dispositivo. Não dependem de nenhuma API. Se a Anthropic, a OpenAI e todas as outras desaparecerem, o teu grafo de conhecimento continua a funcionar, porque a similaridade semântica é computada localmente.

**IA como acelerador, nunca como dependência.** O sistema tem de ser plenamente útil sem IA nenhuma. A IA enriquece — gera flashcards, sintetiza, traduz, detecta contradições — mas o núcleo (ler, destacar, conectar, rever) funciona sem uma única chamada externa. Se a IA cair, perdes conforto, não perdes o arsenal.

---

## VI. Portabilidade Soberana — Multi-dispositivo Sem Render

Queres usar isto no telemóvel, no tablet, no PC, e no que vier. Há dois níveis.

**Nível 1 — O que já tens (PWA).** A app é instalável em iOS, Android, qualquer desktop. O mesmo código, a mesma interface, em todo o lado. Já está construído na Fase 13. Falta testar em mobile e tablet reais — que ainda não fizeste por falta de acesso aos dispositivos.

**Nível 2 — Sincronização soberana.** Tens sync via Supabase (opt-in). Funciona, mas o Supabase é um terceiro. Para soberania verdadeira, a evolução futura é suportar **WebDAV / Nextcloud** — sincronização através do teu próprio servidor, sob o teu controlo total. Os teus dados nunca tocam infraestrutura de terceiros. Isto não é urgente, mas inscreve-se na lógica de arsenal soberano e deve ficar registado como destino.

**A tensão a gerir:** a Biblioteca Imperial está numa drive externa (F:). O scan e o sync têm de lidar com isto. No desktop, a app lê os EPUBs da drive. No mobile, não há drive F: — por isso o mobile depende ou do sync dos metadados, ou de uma cópia selectiva dos livros que queres no telemóvel. A arquitectura tem de separar **a localização dos ficheiros** (que varia por dispositivo) **do conhecimento sobre eles** (que sincroniza universalmente). Os teus highlights e notas seguem-te a todo o lado; os ficheiros EPUB ficam onde fizer sentido em cada dispositivo.

---

## VII. O Que Recusar — Anti-features

Um arsenal define-se tanto pelo que recusa como pelo que inclui. Estas tentações comprometeriam a visão:

- **Nuvem proprietária obrigatória.** Qualquer feature que exija que os teus dados vivam no servidor de outra pessoa para funcionar. Viola a soberania.
- **Formatos fechados.** Guardar notas em base de dados sem exportação para markdown. Cria prisão.
- **IA no caminho crítico.** Qualquer funcionalidade core que deixe de funcionar sem IA. Cria dependência.
- **Gamificação do conhecimento.** Streaks de leitura, pontos, rankings. Distorce o propósito — lês para saber, não para manter uma métrica.
- **Recomendação algorítmica.** Tu escolhes o que lês. Um arsenal não te diz o que pensar.
- **Social.** Partilha, feeds, comparação com outros. O arsenal é privado por definição. A tua biblioteca é o teu pensamento, não conteúdo para audiência.
- **Complexidade de configuração.** Cada opção que adicionas é uma decisão que rouba atenção. O arsenal é poderoso por dentro, simples por fora.

---

## VIII. Roteiro Priorizado

A ordem importa. Construir na sequência errada gera retrabalho. Esta sequência respeita dependências e maximiza valor cedo.

**Etapa A — Fundação da soberania (primeiro, sempre)**
1. Notas como ficheiros `.md` com frontmatter (a base de tudo o resto)
2. Exportação completa do arsenal (ZIP com tudo)
3. Edição de metadados — corrigir os "Desconhecido" e nomes de ficheiro que viste na biblioteca

**Etapa B — Ingestão da Biblioteca Imperial**
4. Scan da pasta `F:\.BACK - UP\BIBLIOTECA IMPERIAL` (Tauri) com gestão graciosa de drive ausente
5. Conversão de formatos para EPUB (PDF, DOCX) — para unificar a biblioteca
6. Categorização automática assistida por IA (com confirmação)

**Etapa C — A camada de conhecimento (o coração do arsenal)**
7. Backlinks bidireccionais nas notas (a malha de Luhmann)
8. O Grafo de Ideias (sugestões laterais durante leitura + vista de grafo)
9. Páginas de Conceito (o commonplace book automático)
10. Síntese inter-livros (RAG sobre toda a biblioteca)

**Etapa D — Profundidade cognitiva**
11. Detecção de contradições e tensões
12. Trilhos de leitura (genealogia intelectual)
13. Revisão espaçada conectada

**Etapa E — Portabilidade e durabilidade plenas**
14. Teste e refinamento em mobile/tablet reais
15. Exportação avançada (Obsidian, Logseq, Anki)
16. Sync soberano via WebDAV/Nextcloud (destino de longo prazo)

---

## IX. O Princípio Que Orienta Tudo

Quando tiveres de decidir entre duas implementações, faz a pergunta de Luhmann: *isto aumenta a capacidade do sistema de gerar conexões que eu não planeei?*

Uma feature que apenas guarda melhor é incremental. Uma feature que faz emergir conhecimento que não estava lá antes — uma conexão entre dois livros que não sabias que se tocavam, uma contradição que não tinhas visto, um padrão no teu próprio pensamento — essa é transformadora. Prioriza sempre a segunda.

O Cat Epub não é onde guardas o que leste. É onde o que leste pensa contigo.

---

> **Próximo passo:** quando aprovares esta visão, traduzo a Etapa A em instruções precisas para o Claude Code — começando pela fundação da soberania (notas como `.md`), porque tudo o resto assenta nela. Não construímos a camada de conhecimento sobre dados presos; construímo-la sobre dados livres.

---

*Versão 1.0 · Maio de 2026 · Para Kouran, construtor de arsenais*
