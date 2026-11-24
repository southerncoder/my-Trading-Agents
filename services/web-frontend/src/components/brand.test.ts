import { describe, expect, it } from 'vitest'
import { badgeColor, simpleIconSlug } from './brand'

describe('simpleIconSlug', () => {
  it('follows the Simple Icons naming rules', () => {
    expect(simpleIconSlug('The Coca-Cola Company')).toBe('cocacola')
    expect(simpleIconSlug('NVIDIA Corporation')).toBe('nvidia')
    expect(simpleIconSlug('JPMorgan Chase & Co.')).toBe('jpmorganchase')
    expect(simpleIconSlug('Société Générale')).toBe('societegenerale')
  })
})

describe('badgeColor', () => {
  it('is stable per ticker', () => {
    expect(badgeColor('KO')).toBe(badgeColor('KO'))
  })
})
