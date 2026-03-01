export function fmtEur(n: number) {
  return `€\u202f${Math.round(n).toLocaleString('de-DE')}`;
}

export function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}
