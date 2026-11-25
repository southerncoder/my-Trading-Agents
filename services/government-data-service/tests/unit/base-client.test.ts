import { describe, expect, it } from 'vitest'
import { redactKeys } from '../../src/base/BaseClient.js'

describe('redactKeys', () => {
  it('masks keys and tokens in logged request parameters, and keeps the rest', () => {
    expect(redactKeys({ api_key: 'abc', series_id: 'UNRATE', registrationkey: 'x', token: 't' })).toEqual({ api_key: '[redacted]', series_id: 'UNRATE', registrationkey: '[redacted]', token: '[redacted]' })
    expect(redactKeys(undefined)).toBeUndefined()
  })
})
