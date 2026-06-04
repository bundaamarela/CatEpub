import { matchPath } from 'react-router-dom';

/** Devolve `true` se a `pathname` corresponder a `/reader/:id`. */
export const isReaderRoute = (pathname: string): boolean =>
  matchPath('/reader/:id', pathname) !== null;
