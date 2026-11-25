import { describe, expect, it } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { validateInput } from './security.js'

function run(url: string, query: Record<string, string> = {}) {
  let status = 200
  let passed = false
  const res = { status: (s: number) => ((status = s), res), json: () => res } as unknown as Response
  validateInput({ url, query, body: undefined } as unknown as Request, res, (() => (passed = true)) as NextFunction)
  return passed ? 'pass' : status
}

describe('validateInput', () => {
  it('lets ordinary words that contain "on...=" through', () => {
    expect(run('/api/nightly/backtest?calls=both&minConfidence=60', { calls: 'both', minConfidence: '60' })).toBe('pass')
  })
  it('blocks an event handler attribute and path traversal', () => {
    expect(run('/api/x?q=%3Cimg%20onerror%3Dx%3E', { q: '<img onerror=x>' })).toBe(400)
    expect(run('/api/../../etc/passwd')).toBe(400)
  })
  it('gives the same answer every time (no global-flag state between calls)', () => {
    const answers = Array.from({ length: 4 }, () => run('/api/x', { q: '<img onclick=alert(1)>' }))
    expect(answers).toEqual([400, 400, 400, 400])
  })
})
