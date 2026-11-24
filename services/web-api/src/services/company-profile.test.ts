import { describe, expect, it } from 'vitest'
import { pickProfile } from './company-profile.js'

describe('pickProfile', () => {
  const body = {
    status: 'success',
    data: {
      price: { longName: 'The Coca-Cola Company', exchangeName: 'NYSE' },
      assetProfile: {
        city: 'Atlanta',
        state: 'GA',
        country: 'United States',
        sector: 'Consumer Defensive',
        fullTimeEmployees: 65900,
        companyOfficers: [{ name: 'Mr. Henrique  Braun', title: 'CEO & Director', age: 58 }, { name: 'No Title' }],
      },
      summaryDetail: { marketCap: 4.1e11, dividendYield: 0.0219, fiftyTwoWeekLow: 67.27 },
      defaultKeyStatistics: { heldPercentInstitutions: 0.68 },
      calendarEvents: { earnings: { earningsDate: ['2026-10-27T12:30:00.000Z', '2027-02-10T12:30:00.000Z'] }, exDividendDate: '2026-12-01T00:00:00.000Z' },
    },
  }

  it('keeps the useful fields and cleans names', () => {
    const p = pickProfile(body, '2026-11-23')!
    expect(p.name).toBe('The Coca-Cola Company')
    expect(p.city).toBe('Atlanta')
    expect(p.employees).toBe(65900)
    expect(p.officers).toEqual([{ name: 'Henrique Braun', title: 'CEO & Director', age: 58 }])
    expect(p.marketCap).toBe(4.1e11)
    expect(p.nextEarnings).toBe('2027-02-10')
    expect(p.exDividend).toBe('2026-12-01')
  })

  it('is null without a company name', () => {
    expect(pickProfile({ data: {} })).toBeNull()
    expect(pickProfile('nonsense')).toBeNull()
  })
})
