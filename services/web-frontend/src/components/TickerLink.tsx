import { Link } from 'react-router-dom'

/** A ticker that opens its stock page. Clicks don't bubble, so it can sit inside a clickable card or row. */
export function TickerLink({ ticker, className = '', style }: { ticker: string; className?: string; style?: React.CSSProperties }) {
  return (
    <Link
      to={`/stock/${encodeURIComponent(ticker)}`}
      className={`ticker-link ${className}`}
      style={style}
      title={`Open ${ticker}`}
      onClick={(e) => e.stopPropagation()}
    >
      {ticker}
    </Link>
  )
}
