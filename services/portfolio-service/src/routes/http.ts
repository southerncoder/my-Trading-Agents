import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

/** A failure the caller caused or can act on; its message is safe to show. */
export class UserError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

export const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data })

/** Wraps an async handler so thrown errors reach the error middleware. */
export const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next)
  }

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  void _next
  if (err instanceof UserError) {
    res.status(err.status).json({ success: false, error: err.message })
    return
  }
  if (err instanceof ZodError) {
    const first = err.issues[0]
    res.status(400).json({ success: false, error: `Invalid ${first?.path.join('.') || 'input'}: ${first?.message ?? 'bad value'}` })
    return
  }
  if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'Body is not valid JSON' })
    return
  }
  console.error('[portfolio-service]', err)
  res.status(500).json({ success: false, error: 'Internal error' })
}

/** Positive integer route parameter, or a 400. */
export function idParam(v: unknown): number {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) throw new UserError('Invalid id')
  return n
}
