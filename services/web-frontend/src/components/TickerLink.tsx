import { Link } from 'react-router-dom'
import { BrandIcon } from './BrandIcon'

/** A ticker that opens its stock page. Clicks don't bubble, so it can sit inside a clickable card or row. */
export function TickerLink({ ticker, className = '', style, icon = true }: { ticker: string; className?: string; style?: React.CSSProperties; icon?: boolean }) {
  return (
    <Link
      to={`/stock/${encodeURIComponent(ticker)}`}
      className={`ticker-link ${icon ? 'inline-flex items-center gap-1.5' : ''} ${className}`}
      style={style}
      title={`Open ${ticker}`}
      onClick={(e) => e.stopPropagation()}
    >
      {icon && <BrandIcon ticker={ticker} size={18} />}
      {ticker}
    </Link>
  )
}
