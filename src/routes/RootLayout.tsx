import { type FC, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { MobileNav } from '@/components/nav/MobileNav';
import { MobileTopBar } from '@/components/nav/MobileTopBar';
import { Sidebar } from '@/components/nav/Sidebar';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ShortcutsOverlay } from '@/components/shared/ShortcutsOverlay';
import { useSyncTrigger } from '@/lib/sync/useSyncTrigger';
import { usePrefs } from '@/lib/store/prefs';
import { cn } from '@/lib/utils/cn';
import { useBreakpoint } from '@/lib/utils/useBreakpoint';
import { isReaderRoute } from './route-utils';
import styles from './RootLayout.module.css';

export const RootLayout: FC = () => {
  const { pathname } = useLocation();
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const sidebarCollapsed = usePrefs((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = usePrefs((s) => s.setSidebarCollapsed);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Mount sync trigger globally — no-op when sync is disabled.
  useSyncTrigger();

  // Global keyboard shortcuts — ignored when focus is in an input/textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        void navigate('/synthesis');
      } else if (mod && e.key === 'k') {
        e.preventDefault();
        void navigate('/search');
      } else if (mod && e.key === ',') {
        e.preventDefault();
        void navigate('/settings');
      } else if (mod && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      } else if (mod && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        void navigate('/graph');
      } else if (!mod && e.key === '?') {
        // Browsers fire '?' as Shift+/, which is fine — only intercept when
        // there's no modifier other than Shift to avoid stealing search.
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, sidebarCollapsed, setSidebarCollapsed, shortcutsOpen]);

  const shortcuts = (
    <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
  );

  // No leitor não há chrome: nem Sidebar, nem MobileNav, nem MobileTopBar
  // são montados (não basta esconder com display:none — os efeitos correriam).
  if (isReaderRoute(pathname)) {
    return (
      <div className={cn(styles.readerShell)}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
        {shortcuts}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={cn(styles.mobileShell)}>
        <MobileTopBar />
        <main className={cn(styles.mobileMain)}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <MobileNav />
        {shortcuts}
      </div>
    );
  }

  return (
    <div className={cn(styles.shell)}>
      <Sidebar />
      <main className={cn(styles.main)}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      {shortcuts}
    </div>
  );
};
