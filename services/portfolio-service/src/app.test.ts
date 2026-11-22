import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { testDb } from './test/db.js'
import { serve } from './test/http.js'

describe('app shell', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let api: Awaited<ReturnType<typeof serve>>
  beforeAll(async () => {
    db = await testDb()
    api = await serve(createApp({ pool: db.pool }))
  })
  afterAll(async () => {
    await api.close()
    await db.drop()
  })

  it('GET /health answers ok when the database answers', async () => {
    expect(await api.get('/health')).toMatchObject({ status: 200, success: true, data: { status: 'ok' } })
  })

  it('unknown paths get a JSON 404', async () => {
    expect(await api.get('/nope')).toMatchObject({ status: 404, success: false, error: 'Not found' })
  })

  it('a body that is not JSON gets a 400, not a 500', async () => {
    expect(await api.post('/health', '{bad')).toMatchObject({ status: 400 })
  })
})
