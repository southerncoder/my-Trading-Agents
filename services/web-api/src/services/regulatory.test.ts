import { describe, expect, it } from 'vitest'
import { exposureOf, findMatters, pmDecision, sentences, themesIn } from './regulatory.js'

const pm = JSON.stringify({
  decision: 'HOLD',
  key_risks: ['Formal charges from the EU antitrust probe could hit margins'],
  data_gaps: ['Scope of the competition probe is unknown'],
  what_would_change_my_mind: 'The probe closing without action',
})

describe('sentences', () => {
  it('strips markdown and splits sentences', () => {
    expect(sentences('- **Regulatory:** The European Commission has launched a probe. Shares fell 2% today on it.')).toEqual([
      'Regulatory: The European Commission has launched a probe.',
      'Shares fell 2% today on it.',
    ])
  })
})

describe('pmDecision', () => {
  it('reads the JSON inside the write-up', () => {
    expect(pmDecision(`Final call\n${pm}\n`)?.decision).toBe('HOLD')
    expect(pmDecision('no json here')).toBeNull()
  })
})

describe('findMatters', () => {
  const stages = {
    news: '* **Legal:** The European Commission has launched an antitrust probe into distribution practices. A new CFO starts in 2027.',
    bear: 'Further formal charges from the EU probe are a catalyst for decline.',
    bull: 'The balance sheet easily absorbs potential antitrust fines.',
    pm,
  }

  it('finds the matter with its stage, agency, sources and how the call used it', () => {
    const [m] = findMatters(stages)
    expect(m.key).toBe('competition')
    expect(m.stages[m.stage]).toBe('Investigation')
    expect(m.active).toBe(true)
    expect(m.reported).toBe(true)
    expect(m.agencies).toEqual(['European Commission'])
    expect(m.fineCapPct).toBe(10)
    expect(m.usedBy).toEqual(expect.arrayContaining(['key_risk', 'data_gap', 'bull']))
    expect(m.mentions[0].stage).toBe('news')
  })

  it('never moves the stage on a possibility', () => {
    const [m] = findMatters({ bull: 'If regulators sued the company, the lawsuit could take years.' })
    expect(m.key).toBe('litigation')
    expect(m.stage).toBe(0)
    expect(m.active).toBe(false)
    expect(exposureOf([m])).toBe('watch')
  })

  it('reads policy matters on their own ladder', () => {
    const [m] = findMatters({ news: 'New export controls on AI chips took effect on Monday, the Commerce Department said.' })
    expect(m.key).toBe('trade')
    expect(m.stages[m.stage]).toBe('In force')
    expect(m.agencies).toContain('US Commerce Dept.')
  })

  it('returns nothing when no write-up mentions regulation', () => {
    expect(findMatters({ news: 'Earnings beat expectations and the stock rose.' })).toEqual([])
    expect(exposureOf([])).toBe('none')
  })
})

describe('exposureOf', () => {
  it('is high once a reported enforcement matter reaches formal charges', () => {
    const ms = findMatters({ news: 'The FTC charged the company with antitrust violations.' })
    expect(ms[0].stages[ms[0].stage]).toBe('Charges or suit filed')
    expect(exposureOf(ms)).toBe('high')
  })
  it('is elevated for a reported investigation', () => {
    expect(exposureOf(findMatters({ news: 'Regulators opened an antitrust investigation into the deal.' }))).toBe('elevated')
  })
})

describe('themesIn', () => {
  it('lists the themes a night mentions', () => {
    expect(themesIn({ news: 'Tariffs on steel rose; a class-action lawsuit was filed.' }).sort()).toEqual(['litigation', 'trade'])
    expect(themesIn(null)).toEqual([])
  })
})

describe('spillover', () => {
  it('marks a probe into another company as not this one', () => {
    const [m] = findMatters({ news: 'The reported SEC probe into Nvidia weighs on the sector. Monitoring the Nvidia SEC probe.' }, ['MSFT', 'Microsoft'])
    expect(m.about).toEqual(['Nvidia'])
    expect(m.active).toBe(false)
    expect(exposureOf([m])).toBe('watch')
  })
  it('keeps a probe into the company itself', () => {
    const [m] = findMatters({ news: 'The EU opened an antitrust probe into Coca-Cola Europacific Partners.' }, ['KO', 'COCA COLA CO'])
    expect(m.about).toEqual([])
    expect(m.active).toBe(true)
  })
})
