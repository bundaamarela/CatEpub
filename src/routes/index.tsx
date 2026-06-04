import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import Home from './home';
import { RootLayout } from './RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: 'library', Component: lazy(() => import('./library')) },
      { path: 'reader/:id', Component: lazy(() => import('./reader')) },
      { path: 'search', Component: lazy(() => import('./search')) },
      { path: 'notes', Component: lazy(() => import('./notes')) },
      { path: 'review', Component: lazy(() => import('./review')) },
      { path: 'graph', Component: lazy(() => import('./graph')) },
      { path: 'concepts', Component: lazy(() => import('./concepts')) },
      { path: 'synthesis', Component: lazy(() => import('./synthesis')) },
      { path: 'trails', Component: lazy(() => import('./trails')) },
      { path: 'settings', Component: lazy(() => import('./settings')) },
    ],
  },
]);
