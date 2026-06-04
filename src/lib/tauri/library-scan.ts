export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface FolderChangeEvent {
  path: string;
  kind: 'added' | 'removed';
}

export const scanFolder = async (path: string): Promise<string[]> => {
  if (!isTauri()) return [];
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string[]>('scan_library_folder', { path });
  } catch {
    return [];
  }
};

export const pathExists = async (path: string): Promise<boolean> => {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('path_exists', { path });
  } catch {
    return false;
  }
};

export const readEpubFile = async (path: string): Promise<ArrayBuffer | null> => {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const bytes = await invoke<number[]>('read_epub_file', { path });
    const arr = new Uint8Array(bytes);
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
};

export const pickFolder = async (): Promise<string | null> => {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string | null>('pick_folder', {});
  } catch {
    return null;
  }
};

export const watchFolder = async (
  path: string,
  onEvent: (ev: FolderChangeEvent) => void,
): Promise<() => void> => {
  if (!isTauri()) return () => {};
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');

    await invoke('watch_library_folder', { path });
    const unlisten = await listen<FolderChangeEvent>('library-folder-changed', (ev) => {
      onEvent(ev.payload);
    });

    return () => {
      unlisten();
    };
  } catch {
    return () => {};
  }
};
