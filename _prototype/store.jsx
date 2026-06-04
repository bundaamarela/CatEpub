// store.jsx — offline-first state management via localStorage

const STORAGE_KEY = 'catepub_v1';

const DEFAULT_BOOKS = [
  {
    id: '1', title: 'O Pequeno Príncipe', author: 'Antoine de Saint-Exupéry',
    progress: 72, pages: 96, currentPage: 69, category: 'Clássico',
    rating: 5, addedAt: '2024-01-10', lastRead: '2024-05-01',
    description: 'Um piloto perde-se no deserto do Saara e encontra um misterioso menino vindo de outro planeta.',
    coverHue: 45, bookmarks: [12, 34, 67], notes: [
      { id: 'n1', page: 12, text: 'O essencial é invisível aos olhos — frase central do livro.', createdAt: '2024-04-20' },
      { id: 'n2', page: 34, text: 'A raposa explica o que significa domesticar alguém.', createdAt: '2024-04-22' },
    ]
  },
  {
    id: '2', title: 'Cem Anos de Solidão', author: 'Gabriel García Márquez',
    progress: 34, pages: 432, currentPage: 147, category: 'Romance',
    rating: 5, addedAt: '2024-02-15', lastRead: '2024-04-28',
    description: 'A saga épica da família Buendía na cidade imaginária de Macondo, ao longo de sete gerações.',
    coverHue: 145, bookmarks: [42, 88], notes: [
      { id: 'n3', page: 42, text: 'Abertura icônica: Macondo como aldeia de vinte casas.', createdAt: '2024-03-10' },
    ]
  },
  {
    id: '3', title: '1984', author: 'George Orwell',
    progress: 88, pages: 328, currentPage: 289, category: 'Distopia',
    rating: 4, addedAt: '2024-01-01', lastRead: '2024-05-03',
    description: 'Em um estado totalitário, Winston Smith tenta resistir ao controle absoluto do Partido.',
    coverHue: 220, bookmarks: [150, 200, 280], notes: []
  },
  {
    id: '4', title: 'Dom Casmurro', author: 'Machado de Assis',
    progress: 12, pages: 256, currentPage: 31, category: 'Clássico BR',
    rating: 4, addedAt: '2024-03-20', lastRead: '2024-04-01',
    description: 'Bentinho narra sua vida e seu casamento com Capitu, questionando a fidelidade da esposa.',
    coverHue: 30, bookmarks: [], notes: []
  },
  {
    id: '5', title: 'Sapiens', author: 'Yuval Noah Harari',
    progress: 55, pages: 512, currentPage: 282, category: 'Não-ficção',
    rating: 5, addedAt: '2024-02-01', lastRead: '2024-04-15',
    description: 'Uma breve história da humanidade, desde o surgimento do Homo sapiens até o presente.',
    coverHue: 280, bookmarks: [100, 200], notes: [
      { id: 'n4', page: 100, text: 'A revolução cognitiva: como a ficção une humanos.', createdAt: '2024-03-01' },
    ]
  },
  {
    id: '6', title: 'O Alquimista', author: 'Paulo Coelho',
    progress: 0, pages: 197, currentPage: 0, category: 'Ficção',
    rating: 4, addedAt: '2024-05-01', lastRead: null,
    description: 'Santiago, um pastor andaluz, viaja pelo mundo em busca de um tesouro e de si mesmo.',
    coverHue: 0, bookmarks: [], notes: []
  },
];

const DEFAULT_PREFS = {
  theme: 'light',         // light | dark | sepia
  fontSize: 18,           // px
  fontFamily: 'serif',    // serif | sans | mono
  lineHeight: 1.8,
  pageWidth: 680,         // max px
  showProgress: true,
  sidebarCollapsed: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        books: parsed.books || DEFAULT_BOOKS,
        prefs: { ...DEFAULT_PREFS, ...(parsed.prefs || {}) },
        readingSession: parsed.readingSession || null,
      };
    }
  } catch (e) {}
  return { books: DEFAULT_BOOKS, prefs: DEFAULT_PREFS, readingSession: null };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

// Hook
function useStore() {
  const initial = React.useMemo(() => loadState(), []);
  const [books, setBooks] = React.useState(initial.books);
  const [prefs, setPrefs] = React.useState(initial.prefs);
  const [session, setSession] = React.useState(initial.readingSession);

  // Persist on change
  React.useEffect(() => {
    saveState({ books, prefs, readingSession: session });
  }, [books, prefs, session]);

  const updateBook = React.useCallback((id, patch) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const addBook = React.useCallback((book) => {
    setBooks(prev => [book, ...prev]);
  }, []);

  const deleteBook = React.useCallback((id) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  }, []);

  const toggleBookmark = React.useCallback((bookId, page) => {
    setBooks(prev => prev.map(b => {
      if (b.id !== bookId) return b;
      const bms = b.bookmarks.includes(page)
        ? b.bookmarks.filter(p => p !== page)
        : [...b.bookmarks, page].sort((a,z) => a-z);
      return { ...b, bookmarks: bms };
    }));
  }, []);

  const addNote = React.useCallback((bookId, page, text) => {
    const note = { id: `n${Date.now()}`, page, text, createdAt: new Date().toISOString().slice(0,10) };
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, notes: [...b.notes, note] } : b));
    return note;
  }, []);

  const deleteNote = React.useCallback((bookId, noteId) => {
    setBooks(prev => prev.map(b => b.id === bookId
      ? { ...b, notes: b.notes.filter(n => n.id !== noteId) }
      : b));
  }, []);

  const updatePref = React.useCallback((key, val) => {
    setPrefs(prev => ({ ...prev, [key]: val }));
  }, []);

  const setReadingSession = React.useCallback((bookId, page) => {
    const now = new Date().toISOString();
    setSession({ bookId, page, startedAt: now });
    if (bookId) {
      setBooks(prev => prev.map(b => {
        if (b.id !== bookId) return b;
        const progress = Math.round((page / b.pages) * 100);
        return { ...b, currentPage: page, progress, lastRead: now.slice(0,10) };
      }));
    }
  }, []);

  return { books, prefs, session, updateBook, addBook, deleteBook, toggleBookmark, addNote, deleteNote, updatePref, setReadingSession };
}

const SAMPLE_CHAPTER = `No dia em que o coronel Aureliano Buendía havia de lembrar-se daquela tarde remota em que seu pai o levou para conhecer o gelo, Macondo era uma aldeia de vinte casas de barro e cana brava construída à beira de um rio de águas diáfanas que se precipitavam por um leito de pedras polidas, brancas e enormes como ovos pré-históricos.

O mundo era tão recente que muitas coisas careciam de nome e para mencioná-las se precisava apontar com o dedo. Todos os anos, lá pelo mês de março, uma família de ciganos maltrapilhos armava sua tenda perto da aldeia e, com grande alvoroço de apitos e timbales, exibia as novas invenções.

Primeiro trouxeram o ímã. Um cigano corpulento, de barba inculta e mãos de pardal, que se apresentou com o nome de Melquíades, fez uma truculenta demonstração pública do que ele mesmo chamava de a oitava maravilha dos sábios alquimistas da Macedônia.

Foi de casa em casa arrastando dois lingotes metálicos e todo mundo ficou apavorado ao ver que panelas, tachos, tenazes e fogareiros tombavam de seu lugar e madeiras rangiam com o desespero dos pregos e parafusos tentando se soltar delas, e até os objetos perdidos há muito tempo apareciam de onde tinham sido procurados com maior ansiedade e se arrastavam em debandada turbulenta atrás dos ferros mágicos de Melquíades.

As coisas têm vida própria — apregoava o cigano com áspero sotaque —, tudo é questão de despertar-lhes a alma. José Arcádio Buendía, cuja desmedida imaginação ia sempre além do engenho da natureza e até além do milagre e da magia, pensou que era possível servir-se daquela invenção inútil para desentranhar o ouro da terra. 

Melquíades, que era um homem honrado, advertiu-o: Para isso não serve. Mas José Arcádio Buendía não acreditava naquele tempo na honradez dos ciganos, e trocou seu mulo e um rebanho de cabras pelos dois lingotes imantados.

Ursula Iguarán, sua mulher, que contava com aqueles animais para engrandecer o exíguo patrimônio doméstico, não conseguiu dissuadi-lo. Onde vai estar o nosso dinheiro para pagar os impostos? — perguntava. Os ciganos nos ensinaram que o dinheiro não compra dinheiro — respondia o marido.`;

Object.assign(window, { useStore, SAMPLE_CHAPTER, DEFAULT_PREFS });
