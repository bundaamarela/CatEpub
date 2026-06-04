import { type FC } from 'react';
import { useShallow } from 'zustand/shallow';

import { cn } from '@/lib/utils/cn';
import { FONT_FAMILIES, FONT_VAR, type FontFamily } from '@/lib/theme/tokens';
import { usePrefs } from '@/lib/store/prefs';
import type { PaginationMode, ThemeChoice } from '@/types/prefs';
import styles from './PanelSettings.module.css';

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
  children?: React.ReactNode;
}

const ToggleRow: FC<ToggleRowProps> = ({ label, checked, onChange, children }) => (
  <div className={cn(styles.toggleGroup)}>
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

export const PanelSettings: FC = () => {
  const p = usePrefs(
    useShallow((s) => ({
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      pageWidth: s.pageWidth,
      paragraphSpacing: s.paragraphSpacing,
      letterSpacing: s.letterSpacing,
      paginationMode: s.paginationMode,
      theme: s.theme,
      showProgress: s.showProgress,
      bionicReading: s.bionicReading,
      focusModeEnabled: s.focusModeEnabled,
      focusCheckinInterval: s.focusCheckinInterval,
      setFontFamily: s.setFontFamily,
      setFontSize: s.setFontSize,
      setLineHeight: s.setLineHeight,
      setPageWidth: s.setPageWidth,
      setParagraphSpacing: s.setParagraphSpacing,
      setLetterSpacing: s.setLetterSpacing,
      setPaginationMode: s.setPaginationMode,
      setTheme: s.setTheme,
      setShowProgress: s.setShowProgress,
      setBionicReading: s.setBionicReading,
      setFocusModeEnabled: s.setFocusModeEnabled,
      setFocusCheckinInterval: s.setFocusCheckinInterval,
    })),
  );

  const previewStyle: React.CSSProperties = {
    fontFamily: FONT_VAR[p.fontFamily as FontFamily] ?? FONT_VAR.serif,
    fontSize: `${p.fontSize}px`,
    lineHeight: p.lineHeight,
    letterSpacing: `${p.letterSpacing}em`,
    maxWidth: `min(${p.pageWidth}px, 100%)`,
  };

  return (
    <div className={cn(styles.panel)}>
      {/* ── Live preview ───────────────────────────────────────────── */}
      <div className={cn(styles.preview)} style={previewStyle} aria-label="Pré-visualização">
        {PREVIEW_TEXT}
      </div>

      {/* ── Tema ───────────────────────────────────────────────────── */}
      <section className={cn(styles.section)}>
        <h3 className={cn(styles.sectionTitle)}>Tema</h3>
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
      </section>

      {/* ── Tipografia ─────────────────────────────────────────────── */}
      <section className={cn(styles.section)}>
        <h3 className={cn(styles.sectionTitle)}>Tipografia</h3>

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

        <SliderRow
          label="Tamanho"
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
          label="Largura"
          value={p.pageWidth}
          min={480}
          max={900}
          step={10}
          display={`${p.pageWidth}px`}
          onChange={p.setPageWidth}
        />
        <SliderRow
          label="Espaç. parág."
          value={p.paragraphSpacing}
          min={0.5}
          max={2}
          step={0.1}
          display={`${p.paragraphSpacing.toFixed(1)}em`}
          onChange={p.setParagraphSpacing}
        />
        <SliderRow
          label="Espaç. letras"
          value={p.letterSpacing}
          min={-0.02}
          max={0.05}
          step={0.005}
          display={`${p.letterSpacing.toFixed(3)}em`}
          onChange={p.setLetterSpacing}
        />
      </section>

      {/* ── Paginação ──────────────────────────────────────────────── */}
      <section className={cn(styles.section)}>
        <h3 className={cn(styles.sectionTitle)}>Paginação</h3>
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
      </section>

      {/* ── Opções ─────────────────────────────────────────────────── */}
      <section className={cn(styles.section)}>
        <h3 className={cn(styles.sectionTitle)}>Opções</h3>

        <ToggleRow
          label="Mostrar progresso"
          checked={p.showProgress}
          onChange={p.setShowProgress}
        />

        <ToggleRow
          label="Modo foco"
          checked={p.focusModeEnabled}
          onChange={p.setFocusModeEnabled}
        >
          {p.focusModeEnabled && (
            <div className={cn(styles.subRow)}>
              <SliderRow
                label="Check-in (min)"
                value={p.focusCheckinInterval}
                min={0}
                max={30}
                step={5}
                display={
                  p.focusCheckinInterval === 0 ? 'Off' : `${p.focusCheckinInterval} min`
                }
                onChange={(v) => p.setFocusCheckinInterval(Math.round(v))}
              />
            </div>
          )}
        </ToggleRow>

        <ToggleRow
          label="Bionic Reading"
          checked={p.bionicReading}
          onChange={p.setBionicReading}
        >
          {p.bionicReading && (
            <p className={cn(styles.warning)}>
              Funcionalidade experimental. Investigação recente sugere resultados mistos para
              leitores típicos.
            </p>
          )}
        </ToggleRow>
      </section>
    </div>
  );
};
