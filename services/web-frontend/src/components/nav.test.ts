import { describe, it, expect } from 'vitest'
import { PRIMARY, MORE, isActive } from './nav'

describe('navigation model', () => {
  it('has the four everyday pages up front and everything else under More', () => {
    expect(PRIMARY.map((n) => n.href)).toEqual(['/', '/picks', '/portfolios', '/stocks'])
    expect(MORE.map((n) => n.href)).toEqual(['/results', '/reviews', '/scorecard', '/platform', '/glossary', '/dashboard', '/analysis', '/backtesting', '/history'])
  })

  it('never lists a page twice', () => {
    const all = [...PRIMARY, ...MORE].map((n) => n.href)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('isActive', () => {
  it('matches Today only on the exact home path', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/stocks', '/')).toBe(false)
  })

  it('matches a section and its sub-paths, but not a look-alike prefix', () => {
    expect(isActive('/stocks', '/stocks')).toBe(true)
    expect(isActive('/scorecard/', '/scorecard')).toBe(true)
    expect(isActive('/stocksfoo', '/stocks')).toBe(false)
  })

  it('treats a single stock page as part of Stocks and one portfolio as part of Portfolios', () => {
    expect(isActive('/stock/NVDA', '/stocks')).toBe(true)
    expect(isActive('/stock/NVDA', '/')).toBe(false)
    expect(isActive('/portfolios/3', '/portfolios')).toBe(true)
  })
})
