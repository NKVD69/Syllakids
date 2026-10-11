type P = { titre?: string };
const base = { fill: "none", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };

export const Maison = (_: P) => (<svg {...base} aria-hidden><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></svg>);
export const Oreille = (_: P) => (<svg {...base} aria-hidden><path d="M7 9.5a5.5 5.5 0 1 1 11 0c0 3-2.4 3.9-3.3 6.2-.6 1.7-1.4 3.8-4 3.8A2.9 2.9 0 0 1 7.6 17" /><path d="M10.5 9.8a2 2 0 1 1 4 0c0 1.2-1.1 1.6-1.6 2.6" /></svg>);
export const HautParleur = (_: P) => (<svg {...base} aria-hidden><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>);
export const Fleche = (_: P) => (<svg {...base} aria-hidden><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>);
export const Coche = (_: P) => (<svg {...base} aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const Cadenas = (_: P) => (<svg {...base} aria-hidden><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>);
export const Gomme = (_: P) => (<svg {...base} aria-hidden><path d="m14.5 4.5 5 5L11 18H6l-2-2z" /><path d="M9.5 9.5l5 5" /><path d="M11 18h9" /></svg>);
export const Etoile = (_: P) => (<svg {...base} aria-hidden><path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" /></svg>);
export const Parler = (_: P) => (<svg {...base} aria-hidden><path d="M5 21v-3.6A7 7 0 0 1 3 12.5 6.8 6.8 0 0 1 9.8 5.6c3.4 0 5.9 2.4 6.2 5.6l1.5 2.5c.3.4 0 .9-.5.9h-1.2v1.8a1.8 1.8 0 0 1-1.8 1.8H12V21" /><path d="M19.2 8.6a4 4 0 0 1 0 4.8" /><path d="M21.4 6.6a7 7 0 0 1 0 8.8" /></svg>);
