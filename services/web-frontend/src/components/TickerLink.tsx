import { Link } from 'react-router-dom'
import { BrandIcon } from './BrandIcon'
import { useName } from './brandStore'

/**
 * A ticker that opens its stock page, with the company's icon and short name. Clicks don't bubble, so it can sit
 * inside a clickable card or row. `name={false}` only where the name is already printed right beside it.
 */
export function TickerLink({ ticker, className = '', style, icon = true, name = true }: { ticker: string; className?: string; style?: React.CSSProperties; icon?: boolean; name?: boolean }) {
  const company = useName(ticker)
  return (
    <Link
      to={`/stock/${encodeURIComponent(ticker)}`}
      className={`ticker-link inline-flex min-w-0 max-w-full items-center gap-1.5 ${className}`}
      style={style}
      title={`Open ${ticker}${company ? ` (${company})` : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {icon && <BrandIcon ticker={ticker} size={18} />}
      <span className="shrink-0">{ticker}</span>
      {name && company && (
        <span className="truncate text-[0.8em] font-normal no-underline" style={{ color: 'var(--color-text-muted, #64748b)', maxWidth: '16em' }}>
          {company}
        </span>
      )}
    </Link>
  )
}

/** A ticker with its company name as plain text (no link), for headings and buttons. */
export function TickerName({ ticker }: { ticker: string }) {
  const company = useName(ticker)
  return <>{company ? `${ticker} (${company})` : ticker}</>
}
