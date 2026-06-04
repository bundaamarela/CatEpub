import { isTauri, readEpubFile } from './library-scan';

const CONVERTIBLE_EXTS = ['.pdf', '.docx', '.txt', '.html'] as const;

export type ConvertibleExt = (typeof CONVERTIBLE_EXTS)[number];

export const isConvertible = (name: string): boolean => {
  const lower = name.toLowerCase();
  return CONVERTIBLE_EXTS.some((ext) => lower.endsWith(ext));
};

export const convertFileToEpub = async (file: File): Promise<File | null> => {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');

    const buf = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buf));
    const tempPath = await invoke<string>('save_temp_file', { data, name: file.name });

    const tmpDir = tempPath.substring(0, Math.max(tempPath.lastIndexOf('/'), tempPath.lastIndexOf('\\')));
    const epubPath = await invoke<string>('convert_to_epub', {
      inputPath: tempPath,
      outputDir: tmpDir,
    });

    const epubBytes = await readEpubFile(epubPath);
    if (epubBytes === null) return null;

    const stem = file.name.replace(/\.[^.]+$/, '');
    return new File([epubBytes], `${stem}.epub`, { type: 'application/epub+zip' });
  } catch {
    return null;
  }
};
