import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { type FC, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

import { useFolderSync } from '@/lib/library/folder-sync';
import { usePrefs } from '@/lib/store/prefs';
import { isTauri, pickFolder } from '@/lib/tauri/library-scan';
import { cn } from '@/lib/utils/cn';
import settingsStyles from '@/routes/Settings.module.css';
import styles from './LibraryFolderSection.module.css';

const LIBRARY_PLACEHOLDER = 'F:\\.BACK - UP\\BIBLIOTECA IMPERIAL';

const formatLastSync = (iso: string | undefined): string | null => {
  if (iso === undefined) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt });
  } catch {
    return null;
  }
};

export const LibraryFolderSection: FC = () => {
  const { libraryFolder, setLibraryFolder } = usePrefs(
    useShallow((s) => ({
      libraryFolder: s.libraryFolder,
      setLibraryFolder: s.setLibraryFolder,
    })),
  );

  const { scanning, lastSyncAt, found, imported, driveAvailable, scanNow } =
    useFolderSync(libraryFolder);

  const onPickFolder = useCallback(async (): Promise<void> => {
    const folder = await pickFolder();
    if (folder !== null) setLibraryFolder(folder);
  }, [setLibraryFolder]);

  if (!isTauri()) {
    return (
      <div className={cn(settingsStyles.card)}>
        <h2 className={cn(settingsStyles.cardTitle)}>Biblioteca Imperial</h2>
        <p className={cn(settingsStyles.notice)}>
          A importação automática de uma pasta local está disponível apenas na app desktop (Tauri).
          Na versão web, importa livros manualmente através da Biblioteca.
        </p>
      </div>
    );
  }

  const lastSyncLabel = formatLastSync(lastSyncAt);
  const folderConfigured = libraryFolder !== undefined && libraryFolder.length > 0;

  return (
    <div className={cn(settingsStyles.card)}>
      <h2 className={cn(settingsStyles.cardTitle)}>Biblioteca Imperial</h2>
      <p className={cn(settingsStyles.notice)}>
        Aponta para a pasta que guarda o teu arsenal de EPUB. A app analisa-a ao arrancar e deteta
        novos ficheiros automaticamente.
      </p>

      <div className={cn(styles.row)}>
        <input
          type="text"
          className={cn(settingsStyles.input)}
          placeholder={LIBRARY_PLACEHOLDER}
          value={libraryFolder ?? ''}
          onChange={(e) => setLibraryFolder(e.target.value || undefined)}
          spellCheck={false}
        />
        <button type="button" className={cn(styles.btn)} onClick={() => void onPickFolder()}>
          Escolher pasta
        </button>
      </div>

      {folderConfigured && (
        <>
          <button
            type="button"
            className={cn(styles.btn, styles.btnScan)}
            onClick={() => void scanNow()}
            disabled={scanning}
          >
            {scanning ? 'A analisar…' : 'Analisar agora'}
          </button>

          <div className={cn(styles.status)}>
            {!driveAvailable && (
              <p className={cn(styles.warn)}>
                Drive indisponível — os livros existentes são preservados.
              </p>
            )}
            {lastSyncLabel !== null && (
              <p className={cn(styles.msg)}>Última sincronização: {lastSyncLabel}.</p>
            )}
            <p className={cn(styles.msg)}>
              {found} {found === 1 ? 'livro encontrado' : 'livros encontrados'}
              {imported > 0 && ` · +${imported} ${imported === 1 ? 'adicionado' : 'adicionados'}`}
              .
            </p>
          </div>
        </>
      )}
    </div>
  );
};
