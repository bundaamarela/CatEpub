import { type FC, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useShallow } from 'zustand/shallow';

import { usePrefs } from '@/lib/store/prefs';
import { getUser, signIn, signOut } from '@/lib/sync/supabase';
import { useSyncTrigger } from '@/lib/sync/useSyncTrigger';
import { cn } from '@/lib/utils/cn';
import settingsStyles from '@/routes/Settings.module.css';
import styles from './SyncSection.module.css';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}

const ToggleRow: FC<ToggleProps> = ({ label, checked, onChange, children }) => (
  <div>
    <label className={cn(settingsStyles.toggleRow)}>
      <span className={cn(settingsStyles.toggleLabel)}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(settingsStyles.toggle, checked && settingsStyles.toggleOn)}
        onClick={() => onChange(!checked)}
      >
        <span className={cn(settingsStyles.toggleThumb)} />
      </button>
    </label>
    {children}
  </div>
);

export const SyncSection: FC = () => {
  const p = usePrefs(
    useShallow((s) => ({
      syncEnabled: s.syncEnabled,
      supabaseUrl: s.supabaseUrl,
      supabaseKey: s.supabaseKey,
      setSyncEnabled: s.setSyncEnabled,
      setSupabaseUrl: s.setSupabaseUrl,
      setSupabaseKey: s.setSupabaseKey,
    })),
  );

  const { status, triggerSync } = useSyncTrigger();

  const [email, setEmail] = useState('');
  const [signInMsg, setSignInMsg] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  const cfg = useMemo(
    () =>
      p.supabaseUrl && p.supabaseKey ? { url: p.supabaseUrl, key: p.supabaseKey } : null,
    [p.supabaseUrl, p.supabaseKey],
  );

  // Refresh signed-in user.
  useEffect(() => {
    let cancelled = false;
    if (!cfg || !p.syncEnabled) {
      const t = setTimeout(() => {
        if (!cancelled) setSignedInAs(null);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    void getUser(cfg).then((u) => {
      if (cancelled) return;
      setSignedInAs(u?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [cfg, p.syncEnabled, status]);

  const handleSignIn = async (): Promise<void> => {
    if (!cfg || !email) return;
    setSignInMsg('A enviar magic link…');
    const result = await signIn(cfg, email);
    if (result.ok) {
      setSignInMsg('Magic link enviado. Verifica o teu email.');
    } else {
      setSignInMsg(`Erro: ${result.error}`);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    if (!cfg) return;
    await signOut(cfg);
    setSignedInAs(null);
    setSignInMsg(null);
  };

  const statusLabel = ((): string => {
    switch (status.kind) {
      case 'idle':
        return 'Por sincronizar';
      case 'syncing':
        return 'A sincronizar…';
      case 'ok':
        try {
          return `Sincronizado ${formatDistanceToNow(new Date(status.lastSyncAt), {
            addSuffix: true,
            locale: pt,
          })}`;
        } catch {
          return 'Sincronizado';
        }
      case 'error':
        return `Erro: ${status.message}`;
    }
  })();

  return (
    <div className={cn(settingsStyles.card)}>
      <h2 className={cn(settingsStyles.cardTitle)}>Sincronização</h2>
      <p className={cn(settingsStyles.notice)}>
        Sync é opcional e opt-in. Os ficheiros EPUB nunca saem do dispositivo — apenas
        anotações, notas e preferências são replicadas.
      </p>
      <ToggleRow
        label="Activar sincronização"
        checked={p.syncEnabled}
        onChange={p.setSyncEnabled}
      >
        <div
          className={cn(settingsStyles.subRow)}
          aria-disabled={!p.syncEnabled}
          style={p.syncEnabled ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
        >
          <div className={cn(settingsStyles.field)}>
            <label htmlFor="sb-url" className={cn(settingsStyles.fieldLabel)}>
              URL do Supabase
            </label>
            <input
              id="sb-url"
              type="text"
              className={cn(settingsStyles.input)}
              placeholder="https://xxxxx.supabase.co"
              value={p.supabaseUrl ?? ''}
              onChange={(e) => p.setSupabaseUrl(e.target.value || undefined)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className={cn(settingsStyles.field)}>
            <label htmlFor="sb-key" className={cn(settingsStyles.fieldLabel)}>
              Chave anónima (anon)
            </label>
            <input
              id="sb-key"
              type="password"
              className={cn(settingsStyles.input)}
              placeholder="eyJhbGciOi..."
              value={p.supabaseKey ?? ''}
              onChange={(e) => p.setSupabaseKey(e.target.value || undefined)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className={cn(styles.session)}>
            <span className={cn(styles.sessionLabel)}>
              {signedInAs ? `Sessão activa: ${signedInAs}` : 'Sem sessão'}
            </span>
            {signedInAs ? (
              <button type="button" className={cn(styles.btn)} onClick={() => void handleSignOut()}>
                Terminar sessão
              </button>
            ) : (
              <div className={cn(styles.signInRow)}>
                <input
                  type="email"
                  className={cn(settingsStyles.input)}
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="button"
                  className={cn(styles.btn, styles.btnPrimary)}
                  onClick={() => void handleSignIn()}
                  disabled={!cfg || email.length === 0}
                >
                  Iniciar sessão
                </button>
              </div>
            )}
            {signInMsg && <p className={cn(styles.signInMsg)}>{signInMsg}</p>}
          </div>

          <div className={cn(styles.statusRow)}>
            <span
              className={cn(
                styles.statusLabel,
                status.kind === 'error' && styles.statusError,
                status.kind === 'syncing' && styles.statusSyncing,
              )}
            >
              {statusLabel}
            </span>
            <button
              type="button"
              className={cn(styles.btn)}
              onClick={() => void triggerSync()}
              disabled={status.kind === 'syncing' || !signedInAs}
            >
              Sincronizar agora
            </button>
          </div>
        </div>
      </ToggleRow>
    </div>
  );
};
