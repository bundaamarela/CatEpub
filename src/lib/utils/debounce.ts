/**
 * Devolve uma função debounced. A função coalesce chamadas dentro de `wait`
 * milissegundos: só executa após `wait` ms sem nova chamada.
 *
 * Tem `flush()` para forçar execução imediata (usado em `beforeunload`/cleanup
 * para não perder o último write).
 */
export interface Debounced<TArgs extends unknown[]> {
  (...args: TArgs): void;
  flush(): void;
  cancel(): void;
}

export const debounce = <TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): Debounced<TArgs> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const debounced = ((...args: TArgs) => {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const a = lastArgs;
      lastArgs = null;
      if (a) fn(...a);
    }, wait);
  }) as Debounced<TArgs>;

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      const a = lastArgs;
      lastArgs = null;
      fn(...a);
    }
  };

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  return debounced;
};
