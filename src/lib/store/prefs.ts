import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { applyTheme, resolveTheme } from '@/lib/theme/apply';
import type {
  AiProvider,
  LibraryView,
  PaginationMode,
  Preferences,
  ThemeChoice,
  TtsProvider,
} from '@/types/prefs';
import type { FontFamily } from '@/lib/theme/tokens';
import { dexieStorage } from './prefs-storage';

export const DEFAULT_PREFERENCES: Preferences = {
  id: 'singleton',
  theme: 'light',
  themeAutoSchedule: { lightStart: '07:00', darkStart: '19:30' },
  fontFamily: 'serif',
  fontSize: 19,
  lineHeight: 1.65,
  pageWidth: 680,
  paragraphSpacing: 1,
  letterSpacing: 0,
  paginationMode: 'paginated',
  showProgress: true,
  sidebarCollapsed: false,
  libraryView: 'grid',
  bionicReading: false,
  focusModeEnabled: false,
  focusCheckinInterval: 0,
  ttsProvider: 'webspeech',
  ttsRate: 1,
  syncEnabled: false,
  aiProvider: 'none',
};

interface PrefsState extends Preferences {
  setTheme: (theme: ThemeChoice) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (lh: number) => void;
  setPageWidth: (w: number) => void;
  setParagraphSpacing: (s: number) => void;
  setLetterSpacing: (s: number) => void;
  setPaginationMode: (m: PaginationMode) => void;
  setShowProgress: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setLibraryView: (v: LibraryView) => void;
  setBionicReading: (v: boolean) => void;
  setFocusModeEnabled: (v: boolean) => void;
  setFocusCheckinInterval: (m: number) => void;
  setTtsProvider: (p: TtsProvider) => void;
  setTtsRate: (r: number) => void;
  setTtsVoice: (v: string | undefined) => void;
  setSyncEnabled: (v: boolean) => void;
  setSupabaseUrl: (v: string | undefined) => void;
  setSupabaseKey: (v: string | undefined) => void;
  setAiProvider: (p: AiProvider) => void;
  setAiApiKey: (key: string | undefined) => void;
  setLibraryFolder: (path: string | undefined) => void;
  reset: () => void;
}

const applyCurrentTheme = (theme: ThemeChoice): void => {
  if (typeof document === 'undefined') return;
  applyTheme(resolveTheme(theme));
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      setTheme: (theme) => {
        applyCurrentTheme(theme);
        set({ theme });
      },
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setPageWidth: (pageWidth) => set({ pageWidth }),
      setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
      setLetterSpacing: (letterSpacing) => set({ letterSpacing }),
      setPaginationMode: (paginationMode) => set({ paginationMode }),
      setShowProgress: (showProgress) => set({ showProgress }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setLibraryView: (libraryView) => set({ libraryView }),
      setBionicReading: (bionicReading) => set({ bionicReading }),
      setFocusModeEnabled: (focusModeEnabled) => set({ focusModeEnabled }),
      setFocusCheckinInterval: (focusCheckinInterval) => set({ focusCheckinInterval }),
      setTtsProvider: (ttsProvider) => set({ ttsProvider }),
      setTtsRate: (ttsRate) => set({ ttsRate }),
      setTtsVoice: (ttsVoice) => {
        if (ttsVoice === undefined) {
          set((s) => {
            const { ttsVoice: _omit, ...rest } = s;
            void _omit;
            return rest as PrefsState;
          });
        } else {
          set({ ttsVoice });
        }
      },
      setSyncEnabled: (syncEnabled) => set({ syncEnabled }),
      setSupabaseUrl: (supabaseUrl) => {
        if (supabaseUrl === undefined || supabaseUrl.length === 0) {
          set((s) => {
            const { supabaseUrl: _omit, ...rest } = s;
            void _omit;
            return rest as PrefsState;
          });
        } else {
          set({ supabaseUrl });
        }
      },
      setSupabaseKey: (supabaseKey) => {
        if (supabaseKey === undefined || supabaseKey.length === 0) {
          set((s) => {
            const { supabaseKey: _omit, ...rest } = s;
            void _omit;
            return rest as PrefsState;
          });
        } else {
          set({ supabaseKey });
        }
      },
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setAiApiKey: (aiApiKey) => {
        if (aiApiKey === undefined) {
          set((s) => {
            const { aiApiKey: _omit, ...rest } = s;
            void _omit;
            return rest as PrefsState;
          });
        } else {
          set({ aiApiKey });
        }
      },
      setLibraryFolder: (libraryFolder) => {
        if (libraryFolder === undefined) {
          set((s) => {
            const { libraryFolder: _omit, ...rest } = s;
            void _omit;
            return rest as PrefsState;
          });
        } else {
          set({ libraryFolder });
        }
      },
      reset: () => {
        applyCurrentTheme(DEFAULT_PREFERENCES.theme);
        set(DEFAULT_PREFERENCES);
      },
    }),
    {
      name: 'cat-epub-prefs',
      version: 2,
      storage: createJSONStorage(() => dexieStorage),
      migrate: (state, version) => {
        if (state === null || typeof state !== 'object') return state;
        const next = { ...(state as Partial<PrefsState>) };
        if (version < 2) {
          // Force the canonical default — older builds may have persisted 'scroll'
          // before the default was finalized as 'paginated'.
          next.paginationMode = 'paginated';
        }
        return next as PrefsState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyCurrentTheme(state.theme);
      },
    },
  ),
);
