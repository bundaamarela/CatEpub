import { type FC, type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const baseProps = (size = 20, rest: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...rest,
});

export const HomeIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

export const LibraryIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <rect x="4" y="3" width="4" height="18" rx="0.5" />
    <rect x="10" y="3" width="4" height="18" rx="0.5" />
    <path d="m17 4 3 1-4 16-3-1z" />
  </svg>
);

export const SearchIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.3-4.3" />
  </svg>
);

export const NotesIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M16 4v3h3" />
    <path d="M8 12h8M8 16h6" />
  </svg>
);

export const ReviewIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3" />
    <path d="M21 4v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3" />
    <path d="M3 20v-5h5" />
  </svg>
);

export const SettingsIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const MenuIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const CloseIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const ChevronLeftIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ArrowRightIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const BookIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
    <path d="M4 5v14" />
    <path d="M8 7h7" />
  </svg>
);

export const StarIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.7 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
  </svg>
);

export const ClockIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const PlusIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const UploadIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M12 16V4" />
    <path d="m6 10 6-6 6 6" />
    <path d="M4 20h16" />
  </svg>
);

export const TrashIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M4 6h16" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 6v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const GridIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const ListIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </svg>
);

export const TocIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M4 6h16M4 11h12M4 16h16M4 21h9" />
  </svg>
);

export const ChatIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <path d="M8 10h8M8 13h6" />
  </svg>
);

export const MoreIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </svg>
);

export const CardsIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <rect x="3" y="7" width="13" height="14" rx="1.5" />
    <path d="M8 4h12a1 1 0 0 1 1 1v13" />
  </svg>
);

export const HeadphonesIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
    <path d="M21 14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2" />
    <path d="M3 14a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2" />
  </svg>
);

export const PauseIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const TrailsIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="12" r="2" />
    <circle cx="9" cy="19" r="2" />
    <path d="M7.5 7.5 16 11M16.5 13.5 11 17.5" strokeDasharray="2 2" />
  </svg>
);

export const SynthesisIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M12 3v4" />
    <path d="M8 7h8" />
    <path d="M10 7v4c0 2-3 4-3 6h10c0-2-3-4-3-6V7" />
    <path d="M7 21h10" />
    <path d="M7 17h10" />
  </svg>
);

export const ConceptsIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M12 3v3M3 12h3M18 12h3M12 18v3" />
    <circle cx="12" cy="12" r="4" />
    <path d="m6.3 6.3 2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
  </svg>
);

export const GraphIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="12" cy="18" r="2.5" />
    <path d="M8 7.5 11 16M16 7.5 13 16" />
    <path d="M8.5 6h7" />
  </svg>
);

export const SparklesIcon: FC<IconProps> = ({ size, ...rest }) => (
  <svg {...baseProps(size, rest)}>
    <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    <path d="m6.5 6.5 2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" />
  </svg>
);

/* ============================================================
   Logos do Cat Epub — três variantes: padrão, vazio, a ler.
   Pixel-art deliberado para combinar com a Pixelify Sans.
   ============================================================ */
type LogoProps = SVGProps<SVGSVGElement> & { size?: number };

const logoBase = (size = 28, rest: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 32 32',
  fill: 'currentColor',
  shapeRendering: 'crispEdges',
  'aria-hidden': true,
  focusable: false,
  ...rest,
});

export const CatLogo: FC<LogoProps> = ({ size, ...rest }) => (
  <svg {...logoBase(size, rest)}>
    {/* orelhas */}
    <rect x="6" y="6" width="4" height="4" />
    <rect x="22" y="6" width="4" height="4" />
    <rect x="8" y="8" width="2" height="2" />
    <rect x="22" y="8" width="2" height="2" />
    {/* cabeça */}
    <rect x="6" y="10" width="20" height="14" />
    {/* olhos */}
    <rect x="10" y="14" width="3" height="3" fill="var(--bg)" />
    <rect x="19" y="14" width="3" height="3" fill="var(--bg)" />
    {/* nariz */}
    <rect x="15" y="18" width="2" height="2" fill="var(--bg)" />
    {/* boca */}
    <rect x="13" y="20" width="2" height="1" fill="var(--bg)" />
    <rect x="17" y="20" width="2" height="1" fill="var(--bg)" />
  </svg>
);

export const CatEmpty: FC<LogoProps> = ({ size, ...rest }) => (
  <svg {...logoBase(size, rest)}>
    <rect x="6" y="6" width="4" height="4" />
    <rect x="22" y="6" width="4" height="4" />
    <rect x="6" y="10" width="20" height="14" />
    <rect x="10" y="14" width="3" height="1" fill="var(--bg)" />
    <rect x="19" y="14" width="3" height="1" fill="var(--bg)" />
    <rect x="14" y="20" width="4" height="1" fill="var(--bg)" />
  </svg>
);

export const CatReading: FC<LogoProps> = ({ size, ...rest }) => (
  <svg {...logoBase(size, rest)}>
    <rect x="6" y="6" width="4" height="4" />
    <rect x="22" y="6" width="4" height="4" />
    <rect x="6" y="10" width="20" height="10" />
    {/* olhos baixos (a ler) */}
    <rect x="10" y="14" width="3" height="2" fill="var(--bg)" />
    <rect x="19" y="14" width="3" height="2" fill="var(--bg)" />
    {/* livro */}
    <rect x="6" y="20" width="20" height="6" />
    <rect x="15" y="20" width="2" height="6" fill="var(--bg)" />
  </svg>
);
