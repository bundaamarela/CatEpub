/**
 * WebSpeechTTS — thin wrapper over the Web Speech API.
 *
 * Unit tests for this class are NOT included in tests/unit/ because
 * window.speechSynthesis and SpeechSynthesisUtterance are not available
 * in jsdom. Browser-level tests (Playwright) would be required.
 */

export type BoundaryCallback = (charIndex: number, charLength: number) => void;

const PT_LANG_PREFIXES = ['pt-PT', 'pt-BR', 'pt'];

const pickVoice = (voices: SpeechSynthesisVoice[], preferred?: string): SpeechSynthesisVoice | null => {
  if (preferred) {
    const exact = voices.find((v) => v.name === preferred);
    if (exact) return exact;
  }
  for (const prefix of PT_LANG_PREFIXES) {
    const match = voices.find((v) => v.lang === prefix || v.lang.startsWith(prefix + '-'));
    if (match) return match;
  }
  return voices[0] ?? null;
};

export class WebSpeechTTS {
  private _synth: SpeechSynthesis;
  private _utterance: SpeechSynthesisUtterance | null = null;
  private _boundaryCallback: BoundaryCallback | null = null;
  private _endCallback: (() => void) | null = null;
  private _rate = 1;
  private _voiceName: string | undefined;

  constructor() {
    this._synth = window.speechSynthesis;
  }

  /** Devolve as vozes disponíveis no sistema, filtradas pelas que suportam pt-*. */
  getVoices(): SpeechSynthesisVoice[] {
    return this._synth.getVoices();
  }

  /** Vozes filtradas para português (pt-PT / pt-BR / pt). */
  getPortugueseVoices(): SpeechSynthesisVoice[] {
    return this._synth.getVoices().filter(
      (v) => v.lang === 'pt' || v.lang.startsWith('pt-'),
    );
  }

  /** Faz ler `text` na língua / voz configurada. */
  speak(text: string): void {
    this.stop();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = this._rate;
    const voice = pickVoice(this._synth.getVoices(), this._voiceName);
    if (voice) {
      utt.voice = voice;
      utt.lang = voice.lang;
    } else {
      utt.lang = 'pt-PT';
    }
    utt.addEventListener('boundary', (e) => {
      this._boundaryCallback?.(e.charIndex, e.charLength ?? 1);
    });
    utt.addEventListener('end', () => {
      this._utterance = null;
      this._endCallback?.();
    });
    utt.addEventListener('error', () => {
      this._utterance = null;
      this._endCallback?.();
    });
    this._utterance = utt;
    this._synth.speak(utt);
  }

  pause(): void {
    if (this._synth.speaking) this._synth.pause();
  }

  resume(): void {
    if (this._synth.paused) this._synth.resume();
  }

  stop(): void {
    this._synth.cancel();
    this._utterance = null;
  }

  setRate(rate: number): void {
    this._rate = Math.min(2, Math.max(0.1, rate));
    if (this._utterance) this._utterance.rate = this._rate;
  }

  setVoice(voiceName: string | undefined): void {
    this._voiceName = voiceName;
  }

  onBoundary(cb: BoundaryCallback): void {
    this._boundaryCallback = cb;
  }

  onEnd(cb: () => void): void {
    this._endCallback = cb;
  }

  get speaking(): boolean {
    return this._synth.speaking && !this._synth.paused;
  }

  get paused(): boolean {
    return this._synth.paused;
  }
}
