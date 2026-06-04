export const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

export type CoverValidationError =
  | { kind: 'invalid-type'; mime: string }
  | { kind: 'too-large'; size: number };

export const validateCover = (file: File): CoverValidationError | null => {
  if (!(ALLOWED_COVER_MIMES as readonly string[]).includes(file.type)) {
    return { kind: 'invalid-type', mime: file.type };
  }
  if (file.size > MAX_COVER_BYTES) {
    return { kind: 'too-large', size: file.size };
  }
  return null;
};

export const formatCoverError = (err: CoverValidationError): string => {
  if (err.kind === 'invalid-type') {
    return `Tipo de ficheiro inválido. Aceita JPEG, PNG ou WebP.`;
  }
  const mb = (err.size / (1024 * 1024)).toFixed(1);
  return `Ficheiro demasiado grande (${mb} MB). Máximo: 2 MB.`;
};
