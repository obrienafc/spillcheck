// Grade colours for badges. Each gives at least 5:1 contrast with white text,
// and the grade letter is always shown, so colour is never the only signal.
export const GRADE_COLORS = {
  'A+': '#1a7f37',
  A: '#2d7a27',
  B: '#5c7300',
  C: '#8a6100',
  D: '#b54708',
  F: '#c4282f',
} as const;

export const UNKNOWN_COLOR = '#6e6e73';

export type Grade = keyof typeof GRADE_COLORS;
