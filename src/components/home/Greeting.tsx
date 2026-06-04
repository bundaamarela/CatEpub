import { type FC } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './Home.module.css';

const periodGreeting = (hour: number): string => {
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
};

interface Props {
  /** Override do relógio (apenas testes). */
  now?: Date;
}

export const Greeting: FC<Props> = ({ now = new Date() }) => (
  <header className={cn(styles.greeting)}>
    <h1 className={cn(styles.greetingTitle)}>{periodGreeting(now.getHours())}, leitor</h1>
    <p className={cn(styles.greetingSub)}>O que vamos ler hoje?</p>
  </header>
);
