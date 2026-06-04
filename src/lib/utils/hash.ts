/** Calcula SHA-256 hex de um Blob ou string. */
export const sha256 = async (input: Blob | ArrayBuffer | string): Promise<string> => {
  let buf: ArrayBuffer;
  if (typeof input === 'string') {
    buf = new TextEncoder().encode(input).buffer as ArrayBuffer;
  } else if (input instanceof Blob) {
    buf = await input.arrayBuffer();
  } else {
    buf = input;
  }
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
