import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { applyTheme, resolveTheme } from '@/lib/theme/apply';
import { usePrefs } from '@/lib/store/prefs';
import { router } from '@/routes';

export const App = () => {
  const theme = usePrefs((s) => s.theme);

  useEffect(() => {
    applyTheme(resolveTheme(theme));
  }, [theme]);

  return <RouterProvider router={router} />;
};
