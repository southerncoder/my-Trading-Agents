export type Direction = 'long' | 'short'

/** One end-of-day price bar. */
export interface Bar {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export const round = (n: number, places = 4) => {
  const f = 10 ** places
  return Math.round((n + Number.EPSILON) * f) / f
}
