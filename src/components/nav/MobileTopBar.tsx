import { type FC, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { CatLogo, CloseIcon, MenuIcon } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import { Sidebar } from './Sidebar';
import styles from './MobileTopBar.module.css';

export const MobileTopBar: FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);

  // Reset declarativo: fecha o overlay quando a rota muda (back/forward inclusive).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Bloqueia o scroll do body enquanto o overlay está aberto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header className={cn(styles.root)}>
        <button
          type="button"
          className={cn(styles.iconButton)}
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <MenuIcon />
        </button>
        <div className={cn(styles.brand)}>
          <CatLogo size={22} />
          <span className={cn(styles.brandText)}>Cat Epub</span>
        </div>
        <span className={cn(styles.spacer)} />
      </header>

      {open && (
        <div
          className={cn(styles.overlay)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
          onClick={() => setOpen(false)}
        >
          <div className={cn(styles.overlayPanel)} onClick={(e) => e.stopPropagation()}>
            <div className={cn(styles.overlayClose)}>
              <button
                type="button"
                className={cn(styles.iconButton)}
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
              >
                <CloseIcon />
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};
