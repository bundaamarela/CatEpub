import type { FontFamily, Theme } from '@/lib/theme/tokens';

export type ThemeChoice = Theme | 'auto';

export type PaginationMode = 'paginated' | 'scroll';
export type TtsProvider = 'webspeech' | 'elevenlabs';
export type AiProvider = 'anthropic' | 'none';
export type LibraryView = 'grid' | 'list';

export interface ThemeAutoSchedule {
  lightStart: string; // formato HH:mm (24h)
  darkStart: string;
}

/**
 * Preferências do utilizador.
 *
 * Espelha 1:1 o `Preferences` da Secção 4.1 do CLAUDE.md, com:
 *  - `id: 'singleton'` para sincronizar com Dexie no Phase 3.
 *  - `aiApiKey` opcional respeitando `exactOptionalPropertyTypes`.
 */
export interface Preferences {
  id: 'singleton';
  theme: ThemeChoice;
  themeAutoSchedule: ThemeAutoSchedule;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  pageWidth: number;
  paragraphSpacing: number;
  letterSpacing: number;
  paginationMode: PaginationMode;
  showProgress: boolean;
  sidebarCollapsed: boolean;
  libraryView: LibraryView;
  bionicReading: boolean;
  focusModeEnabled: boolean;
  focusCheckinInterval: number; // minutos; 0 = desligado
  ttsProvider: TtsProvider;
  ttsRate: number;
  ttsVoice?: string;
  syncEnabled: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  aiProvider: AiProvider;
  aiApiKey?: string;
  libraryFolder?: string;
}
