import type { AddressInfo } from 'node:net'
import type express from 'express'

/** Starts the app on a free port; returns a JSON client and a close function. */
export async function serve(app: express.Express) {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/portfolio`
  async function call(method: string, path: string, body?: unknown) {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
    const json = (await res.json()) as { success: boolean; data?: unknown; error?: string }
    return { status: res.status, ...json }
  }
  return {
    get: (p: string) => call('GET', p),
    post: (p: string, b?: unknown) => call('POST', p, b ?? {}),
    patch: (p: string, b?: unknown) => call('PATCH', p, b ?? {}),
    del: (p: string) => call('DELETE', p),
    close: () => new Promise<void>((r) => server.close(() => r())),
  }
}
