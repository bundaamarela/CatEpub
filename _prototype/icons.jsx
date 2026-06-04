// icons.jsx — all inline SVG icons, stroke-based, monochrome
const I = ({ d, size = 20, stroke = "currentColor", sw = 1.5, fill = "none", children, vb = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d}/> : children}
  </svg>
);

const Icons = {
  Home: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></I>,
  Book: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></I>,
  Search: ({size=20,sw=1.5})=><I size={size} sw={sw}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></I>,
  Settings: ({size=20,sw=1.5})=><I size={size} sw={sw}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></I>,
  Upload: ({size=20,sw=1.5})=><I size={size} sw={sw}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></I>,
  Bookmark: ({size=20,sw=1.5,filled=false})=><I size={size} sw={sw} fill={filled?"currentColor":"none"}><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></I>,
  ChevronLeft: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="m15 18-6-6 6-6"/></I>,
  ChevronRight: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="m9 18 6-6-6-6"/></I>,
  ChevronDown: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="m6 9 6 6 6-6"/></I>,
  Menu: ({size=20,sw=1.5})=><I size={size} sw={sw}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></I>,
  X: ({size=20,sw=1.5})=><I size={size} sw={sw}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></I>,
  Plus: ({size=20,sw=1.5})=><I size={size} sw={sw}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></I>,
  Moon: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></I>,
  Sun: ({size=20,sw=1.5})=><I size={size} sw={sw}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></I>,
  Type: ({size=20,sw=1.5})=><I size={size} sw={sw}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></I>,
  AlignLeft: ({size=20,sw=1.5})=><I size={size} sw={sw}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></I>,
  List: ({size=20,sw=1.5})=><I size={size} sw={sw}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></I>,
  Edit: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></I>,
  Trash: ({size=20,sw=1.5})=><I size={size} sw={sw}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></I>,
  Eye: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></I>,
  Clock: ({size=20,sw=1.5})=><I size={size} sw={sw}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></I>,
  Star: ({size=20,sw=1.5,filled=false})=><I size={size} sw={sw} fill={filled?"currentColor":"none"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></I>,
  MoreH: ({size=20,sw=1.5})=><I size={size} sw={sw}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></I>,
  Paw: ({size=20,sw=1.5})=><svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><ellipse cx="6" cy="6" rx="2.5" ry="3"/><ellipse cx="12" cy="4.5" rx="2.5" ry="3"/><ellipse cx="18" cy="6" rx="2.5" ry="3"/><ellipse cx="3.5" cy="12" rx="2" ry="2.5"/><ellipse cx="20.5" cy="12" rx="2" ry="2.5"/><ellipse cx="12" cy="17" rx="6" ry="5.5"/></svg>,
  ArrowRight: ({size=20,sw=1.5})=><I size={size} sw={sw}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></I>,
  Download: ({size=20,sw=1.5})=><I size={size} sw={sw}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></I>,
  Info: ({size=20,sw=1.5})=><I size={size} sw={sw}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></I>,
};

Object.assign(window, { Icons });
