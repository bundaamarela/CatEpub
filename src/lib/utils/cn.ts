/**
 * Concatena classes CSS, ignorando valores `undefined`/`null`/`false`/`""`.
 *
 * Útil sob `noUncheckedIndexedAccess: true` em conjunto com CSS Modules,
 * onde `styles.foo` aparece como `string | undefined`.
 *
 * ```ts
 * cn(styles.root, isActive && styles.active) // "root active" ou "root"
 * ```
 */
export const cn = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
