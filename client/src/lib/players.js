export const PLAYER_PALETTE = [
  { id: 'p1',  color: 'oklch(0.72 0.18 285)' }, // violet
  { id: 'p2',  color: 'oklch(0.78 0.16 200)' }, // cyan
  { id: 'p3',  color: 'oklch(0.82 0.16 80)'  }, // amber
  { id: 'p4',  color: 'oklch(0.74 0.18 25)'  }, // rose
  { id: 'p5',  color: 'oklch(0.78 0.18 150)' }, // mint
  { id: 'p6',  color: 'oklch(0.78 0.16 330)' }, // pink
  { id: 'p7',  color: 'oklch(0.74 0.16 250)' }, // blue
  { id: 'p8',  color: 'oklch(0.78 0.18 110)' }, // lime
  { id: 'p9',  color: 'oklch(0.74 0.18 50)'  }, // orange
  { id: 'p10', color: 'oklch(0.76 0.18 0)'   }, // red
];

export function colorFor(id) {
  const p = PLAYER_PALETTE.find(x => x.id === id);
  return p ? p.color : 'oklch(0.72 0.18 285)';
}

export function avatarGradient(id) {
  const c = colorFor(id);
  return `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 60%, black 40%))`;
}

export function getPlayerPaletteId(index) {
  return PLAYER_PALETTE[index % PLAYER_PALETTE.length].id;
}

export function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}
