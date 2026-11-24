import { Link, useParams } from 'react-router-dom'
import { Markdown } from '../components/portfolio/Markdown'
import { sectionTitle, useLoad } from '../components/portfolio/ui'
import { card, muted } from '../components/today/format'
import { BookOpen } from 'lucide-react'
import { PageHeader } from '../components/viz'
import { fetchReview, fetchReviews } from '../services/portfolio'

export function Reviews() {
  const { week } = useParams()
  const list = useLoad(fetchReviews, 'list')
  const current = week ?? list.data?.[0]?.week_ending
  const review = useLoad(() => (current ? fetchReview(current) : Promise.resolve(null)), current ?? 'none')

  return (
    <div className="app-page mx-auto max-w-6xl space-y-6 p-3 sm:p-4 md:p-8">
      <PageHeader icon={BookOpen} title="Weekly review" sub="Written each Friday after the nightly run, from the week's numbers, to teach rather than to tip. Every result is compared with SPY." />
      {list.error && <p role="alert" style={{ color: '#D4501A' }}>Could not load reviews: {list.error}</p>}
      {list.data?.length === 0 && <p className="text-sm" style={muted}>No reviews yet. The first one is written on Friday evening.</p>}

      <div className="flex flex-col gap-4 lg:flex-row">
        {!!list.data?.length && (
          <nav aria-label="Weeks" className="shrink-0 lg:w-56">
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
              {list.data.map((r) => (
                <li key={r.week_ending} className="shrink-0">
                  <Link
                    to={`/reviews/${r.week_ending}`}
                    aria-current={r.week_ending === current ? 'page' : undefined}
                    className="clickable block rounded-xl px-4 py-3 text-base"
                    style={r.week_ending === current ? { ...card, fontWeight: 700, borderColor: 'var(--color-primary, #2563eb)' } : card}
                  >
                    Week ending {r.week_ending}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {review.data && (
          <article className="min-w-0 flex-1 rounded-2xl p-6 text-lg leading-relaxed md:p-8" style={card} aria-labelledby="review-title">
            <h2 id="review-title" className={sectionTitle}>Week ending {review.data.week_ending}</h2>
            <p className="mb-2 text-xs" style={muted}>{review.data.model ? `Written by ${review.data.model}` : 'Numbers only (the model could not be reached)'}</p>
            <Markdown text={review.data.body_md ?? ''} />
          </article>
        )}
        {review.error && <p role="alert" style={{ color: '#D4501A' }}>{review.error}</p>}
      </div>
    </div>
  )
}
