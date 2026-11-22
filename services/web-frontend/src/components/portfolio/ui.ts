import { useCallback, useEffect, useState } from 'react'

/** Loads data when its inputs change; `reload` fetches again (after a trade, an ack, ...). */
export function useLoad<T>(fn: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setError(null)
    fn().then(
      (d) => live && setData(d),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, reload }
}

export const money = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined ? '-' : `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

export const signedMoney = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const field = 'rounded border px-2 py-1.5 text-sm'
export const button = 'rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50'
export const primaryButton = 'rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50'
export const primaryStyle = { background: 'var(--color-primary, #2563eb)' }
export const sectionTitle = 'section-title text-lg font-semibold'
