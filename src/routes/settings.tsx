import { type CSSProperties, type FC, type ReactNode, useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';

import { LibraryFolderSection } from '@/components/settings/LibraryFolderSection';
import { SyncSection } from '@/components/settings/SyncSection';
import { cn } from '@/lib/utils/cn';
import { FONT_FAMILIES, FONT_VAR, type FontFamily } from '@/lib/theme/tokens';
import { usePrefs } from '@/lib/store/prefs';
import type { PaginationMode, ThemeChoice } from '@/types/prefs';
import styles from './Settings.module.css';

const PREVIEW_TEXT =
  'O leitor contempla a página como quem admira um horizonte de possibilidades infinitas.';

const FONT_LABELS: Record<FontFamily, string> = {
  serif: 'Serif',
  sans: 'Sans',
  dyslexic: 'Acessível',
};

const THEME_OPTIONS: Array<{ id: ThemeChoice; label: string }> = [
  { id: 'light', label: 'Claro' },
  { id: 'sepia', label: 'Sépia' },
  { id: 'dark', label: 'Escuro' },
  { id: 'black', label: 'Preto' },
  { id: 'auto', label: 'Auto' },
];

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

const SliderRow: FC<SliderRowProps> = ({ label, value, min, max, step, display, onChange }) => (
  <div className={cn(styles.row)}>
    <div className={cn(styles.rowLabel)}>
      <span>{label}</span>
      <span className={cn(styles.value)}>{display}</span>
    </div>
    <input
      type="range"
      className={cn(styles.slider)}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}

const ToggleRow: FC<ToggleRowProps> = ({ label, checked, onChange, children }) => (
  <div>
    <label className={cn(styles.toggleRow)}>
      <span className={cn(styles.toggleLabel)}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(styles.toggle, checked && styles.toggleOn)}
        onClick={() => onChange(!checked)}
      >
        <span className={cn(styles.toggleThumb)} />
      </button>
    </label>
    {children}
  </div>
);

const SovereigntySection: FC = () => {
  const [includeEpubs, setIncludeEpubs] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setProgress(0);
    try {
      const { exportArsenal, downloadBlob } = await import('@/lib/knowledge/export');
      const blob = await exportArsenal({ includeEpubs, onProgress: setProgress });
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `cat-epub-arsenal-${date}.zip`);
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 500);
    }
  }, [includeEpubs]);

  return (
    <div className={cn(styles.card)}>
      <h2 className={cn(styles.cardTitle)}>Soberania de Dados</h2>
      <label className={cn(styles.checkboxRow)}>
        <input
          type="checkbox"
          checked={includeEpubs}
          onChange={(e) => setIncludeEpubs(e.target.checked)}
        />
        Incluir ficheiros EPUB
      </label>
      <button
        type="button"
        className={cn(styles.exportBtn)}
        disabled={exporting}
        onClick={() => void handleExport()}
      >
        {exporting ? 'A exportar…' : 'Exportar arsenal completo'}
      </button>
      {exporting && (
        <div className={cn(styles.progressBar)}>
          <div className={cn(styles.progressFill)} style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className={cn(styles.notice)}>
        Gera um ficheiro ZIP com todas as notas em Markdown, highlights, flashcards e metadados.
        Compatível com Obsidian, Logseq e qualquer editor de texto.
      </p>
    </div>
  );
};

const Settings: FC = () => {
  const p = usePrefs(
    useShallow((s) => ({
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      pageWidth: s.pageWidth,
      letterSpacing: s.letterSpacing,
      paginationMode: s.paginationMode,
      theme: s.theme,
      focusModeEnabled: s.focusModeEnabled,
      focusCheckinInterval: s.focusCheckinInterval,
      ttsProvider: s.ttsProvider,
      ttsRate: s.ttsRate,
      ttsVoice: s.ttsVoice,
      aiProvider: s.aiProvider,
      aiApiKey: s.aiApiKey,
      showQuote: s.showQuote,
      setShowQuote: s.setShowQuote,
      setTtsProvider: s.setTtsProvider,
      setTtsRate: s.setTtsRate,
      setTtsVoice: s.setTtsVoice,
      setFontFamily: s.setFontFamily,
      setFontSize: s.setFontSize,
      setLineHeight: s.setLineHeight,
      setPageWidth: s.setPageWidth,
      setPaginationMode: s.setPaginationMode,
      setTheme: s.setTheme,
      setFocusModeEnabled: s.setFocusModeEnabled,
      setFocusCheckinInterval: s.setFocusCheckinInterval,
      setAiProvider: s.setAiProvider,
      setAiApiKey: s.setAiApiKey,
    })),
  );

  const aiEnabled = p.aiProvider === 'anthropic';
  const ttsEnabled = p.ttsProvider === 'webspeech';

  const [ptVoices, setPtVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = (): void => {
      const all = window.speechSynthesis.getVoices();
      setPtVoices(all.filter((v) => v.lang === 'pt' || v.lang.startsWith('pt-')));
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const previewStyle: CSSProperties = {
    fontFamily: FONT_VAR[p.fontFamily],
    fontSize: `${p.fontSize}px`,
    lineHeight: p.lineHeight,
    letterSpacing: `${p.letterSpacing}em`,
    maxWidth: `min(${p.pageWidth}px, 100%)`,
  };

  return (
    <section className={cn(styles.page)}>
      <h1 className={cn(styles.title)}>Definições</h1>

      <div className={cn(styles.card)}>
        <h2 className={cn(styles.cardTitle)}>Leitura</h2>

        <div className={cn(styles.preview)} style={previewStyle} aria-label="Pré-visualização">
          {PREVIEW_TEXT}
        </div>

        <div className={cn(styles.field)}>
          <span className={cn(styles.fieldLabel)}>Tema</span>
          <div className={cn(styles.themeGrid)}>
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn(styles.themeChip, p.theme === t.id && styles.themeChipActive)}
                onClick={() => p.setTheme(t.id)}
                aria-pressed={p.theme === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(styles.field)}>
          <span className={cn(styles.fieldLabel)}>Tipografia</span>
          <div className={cn(styles.segmented)}>
            {FONT_FAMILIES.map((f) => (
              <button
                key={f}
                type="button"
                className={cn(styles.segChip, p.fontFamily === f && styles.segChipActive)}
                onClick={() => p.setFontFamily(f)}
                aria-pressed={p.fontFamily === f}
              >
                {FONT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(styles.field)}>
          <span className={cn(styles.fieldLabel)}>Modo de paginação</span>
          <div className={cn(styles.segmented)}>
            {(['paginated', 'scroll'] as PaginationMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={cn(styles.segChip, p.paginationMode === m && styles.segChipActive)}
                onClick={() => p.setPaginationMode(m)}
                aria-pressed={p.paginationMode === m}
              >
                {m === 'paginated' ? 'Paginado' : 'Scroll'}
              </button>
            ))}
          </div>
        </div>

        <SliderRow
          label="Tamanho do texto"
          value={p.fontSize}
          min={14}
          max={28}
          step={1}
          display={`${p.fontSize}px`}
          onChange={p.setFontSize}
        />
        <SliderRow
          label="Entrelinhamento"
          value={p.lineHeight}
          min={1.4}
          max={2.2}
          step={0.05}
          display={p.lineHeight.toFixed(2)}
          onChange={p.setLineHeight}
        />
        <SliderRow
          label="Largura da página"
          value={p.pageWidth}
          min={480}
          max={900}
          step={10}
          display={`${p.pageWidth}px`}
          onChange={p.setPageWidth}
        />
      </div>

      <div className={cn(styles.card)}>
        <h2 className={cn(styles.cardTitle)}>Início</h2>
        <ToggleRow
          label="Mostrar frase diária"
          checked={p.showQuote}
          onChange={p.setShowQuote}
        />
      </div>

      <div className={cn(styles.card)}>
        <h2 className={cn(styles.cardTitle)}>Foco</h2>
        <ToggleRow
          label="Modo foco"
          checked={p.focusModeEnabled}
          onChange={p.setFocusModeEnabled}
        >
          {p.focusModeEnabled && (
            <div className={cn(styles.subRow)}>
              <SliderRow
                label="Check-in de atenção"
                value={p.focusCheckinInterval}
                min={0}
                max={30}
                step={5}
                display={
                  p.focusCheckinInterval === 0 ? 'Desligado' : `${p.focusCheckinInterval} min`
                }
                onChange={(v) => p.setFocusCheckinInterval(Math.round(v))}
              />
            </div>
          )}
        </ToggleRow>
      </div>

      <div className={cn(styles.card)}>
        <h2 className={cn(styles.cardTitle)}>Leitura em voz alta</h2>
        <ToggleRow
          label="Activar leitura em voz alta"
          checked={ttsEnabled}
          onChange={(v) => p.setTtsProvider(v ? 'webspeech' : 'elevenlabs')}
        >
          {ttsEnabled && (
            <div className={cn(styles.subRow)}>
              <div className={cn(styles.field)}>
                <span className={cn(styles.fieldLabel)}>Velocidade</span>
                <div className={cn(styles.segmented)}>
                  {([0.5, 0.75, 1, 1.25, 1.5, 2] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={cn(styles.segChip, p.ttsRate === r && styles.segChipActive)}
                      onClick={() => p.setTtsRate(r)}
                      aria-pressed={p.ttsRate === r}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              </div>
              {ptVoices.length > 0 && (
                <div className={cn(styles.field)}>
                  <label htmlFor="tts-voice" className={cn(styles.fieldLabel)}>
                    Voz
                  </label>
                  <select
                    id="tts-voice"
                    className={cn(styles.select)}
                    value={p.ttsVoice ?? ''}
                    onChange={(e) => p.setTtsVoice(e.target.value || undefined)}
                  >
                    <option value="">Auto (pt-PT)</option>
                    {ptVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </ToggleRow>
      </div>

      <div className={cn(styles.card)}>
        <h2 className={cn(styles.cardTitle)}>IA</h2>
        <ToggleRow
          label="Activar IA (Anthropic)"
          checked={aiEnabled}
          onChange={(v) => p.setAiProvider(v ? 'anthropic' : 'none')}
        >
          {aiEnabled && (
            <div className={cn(styles.subRow)}>
              <div className={cn(styles.field)}>
                <label htmlFor="ai-api-key" className={cn(styles.fieldLabel)}>
                  API key Anthropic
                </label>
                <input
                  id="ai-api-key"
                  type="password"
                  className={cn(styles.input)}
                  placeholder="sk-ant-..."
                  value={p.aiApiKey ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    p.setAiApiKey(v.length === 0 ? undefined : v);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className={cn(styles.notice)}>
                As queries de chat são enviadas para a Anthropic. Os embeddings ficam no teu
                dispositivo.
              </p>
            </div>
          )}
        </ToggleRow>
      </div>

      <SovereigntySection />

      <LibraryFolderSection />

      <SyncSection />

      <div className={cn(styles.card)}>
        <h2 className={cn(styles.cardTitle)}>Atalhos de teclado</h2>
        <table className={cn(styles.shortcutsTable)}>
          <tbody>
            <tr>
              <td colSpan={2} className={cn(styles.shortcutsGroup)}>Global</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd></span></td>
              <td>Pesquisa global</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>,</kbd></span></td>
              <td>Definições</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>B</kbd></span></td>
              <td>Mostrar / recolher barra lateral</td>
            </tr>
            <tr>
              <td colSpan={2} className={cn(styles.shortcutsGroup)}>No leitor</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>←</kbd> / <kbd>→</kbd></span></td>
              <td>Página anterior / seguinte</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>Espaço</kbd></span></td>
              <td>Mostrar / ocultar interface</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>H</kbd></span></td>
              <td>Destacar selecção a amarelo</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>N</kbd></span></td>
              <td>Painel de notas</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>B</kbd></span></td>
              <td>Adicionar marcador</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>F</kbd></span></td>
              <td>Activar / desactivar modo foco</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>T</kbd></span></td>
              <td>Activar / parar leitura em voz alta</td>
            </tr>
            <tr>
              <td><span className={cn(styles.kbd)}><kbd>Esc</kbd></span></td>
              <td>Fechar painéis / cancelar selecção</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Settings;
