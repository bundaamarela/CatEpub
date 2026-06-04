import { type FC } from 'react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils/cn';
import { MOBILE_NAV_ITEMS } from './nav-items';
import styles from './MobileNav.module.css';

export const MobileNav: FC = () => {
  return (
    <nav className={cn(styles.root)} aria-label="Navegação móvel">
      {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => cn(styles.item, isActive && styles.itemActive)}
          aria-label={label}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
