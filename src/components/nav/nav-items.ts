import {
  ConceptsIcon,
  GraphIcon,
  HomeIcon,
  LibraryIcon,
  NotesIcon,
  ReviewIcon,
  SearchIcon,
  SettingsIcon,
  SynthesisIcon,
  TrailsIcon,
} from '@/components/icons';
import type { ComponentType, SVGProps } from 'react';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Início', icon: HomeIcon },
  { to: '/library', label: 'Biblioteca', icon: LibraryIcon },
  { to: '/search', label: 'Pesquisa', icon: SearchIcon },
  { to: '/notes', label: 'Notas', icon: NotesIcon },
  { to: '/review', label: 'Revisão', icon: ReviewIcon },
  { to: '/graph', label: 'Grafo', icon: GraphIcon },
  { to: '/concepts', label: 'Conceitos', icon: ConceptsIcon },
  { to: '/synthesis', label: 'Síntese', icon: SynthesisIcon },
  { to: '/trails', label: 'Trilhos', icon: TrailsIcon },
  { to: '/settings', label: 'Definições', icon: SettingsIcon },
];

/** Subconjunto da bottom nav (4 itens, fica fora Review e Settings). */
export const MOBILE_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((item) =>
  ['/', '/library', '/search', '/notes'].includes(item.to),
);
