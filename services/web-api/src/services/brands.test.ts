import { describe, expect, it } from 'vitest'
import { domainFromWebsite, loadBrands, pickBrand } from './brands.js'

describe('domainFromWebsite', () => {
  it('keeps the bare host', () => {
    expect(domainFromWebsite('https://www.coca-colacompany.com/')).toBe('coca-colacompany.com')
    expect(domainFromWebsite('nvidia.com')).toBe('nvidia.com')
    expect(domainFromWebsite('not a url')).toBeUndefined()
    expect(domainFromWebsite(undefined)).toBeUndefined()
  })
})

describe('pickBrand', () => {
  it('reads name and domain', () => {
    expect(pickBrand({ data: { price: { longName: 'NVIDIA Corporation' }, assetProfile: { website: 'https://www.nvidia.com' } } })).toEqual({
      name: 'NVIDIA Corporation',
      domain: 'nvidia.com',
    })
  })
})

describe('loadBrands', () => {
  it('fetches once per ticker and caches', async () => {
    let calls = 0
    const deps = {
      yahooUrl: 'http://y',
      fetchText: async (u: string) => {
        calls++
        if (u.includes('/BAD')) throw new Error('down')
        return JSON.stringify({ data: { price: { longName: 'Acme Inc' }, assetProfile: { website: 'acme.com' } } })
      },
    }
    const a = await loadBrands(deps, ['ACME1', 'ACME1', 'BAD'], 1000)
    expect(a.ACME1).toEqual({ name: 'Acme Inc', domain: 'acme.com' })
    expect(a.BAD).toEqual({})
    await loadBrands(deps, ['ACME1', 'BAD'], 2000)
    expect(calls).toBe(2)
  })
})
