import { type FC } from 'react';
import { CatLogo } from '@/components/icons';
import styles from './PageSkeleton.module.css';

export const PageSkeleton: FC = () => (
  <div className={styles.root} aria-label="A carregar…" aria-busy="true">
    <div className={styles.logo}>
      <CatLogo size={40} />
    </div>
  </div>
);
