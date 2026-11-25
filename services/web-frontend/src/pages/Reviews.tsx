import { Link, useParams } from 'react-router-dom'
import { BarChart3, BookOpen, PenLine } from 'lucide-react'
import { useLoad } from '../components/portfolio/ui'
import { card, muted } from '../components/today/format'
import { PageHeader, SectionTitle } from '../components/viz'
import { ReviewSections, WeekGlance, weekRange } from '../components/reviews/week'
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

      {!!list.data?.length && (
        <nav aria-label="Weeks">
          <ul className="flex flex-wrap gap-2">
            {list.data.map((r) => (
              <li key={r.week_ending}>
                <Link
                  to={`/reviews/${r.week_ending}`}
                  aria-current={r.week_ending === current ? 'page' : undefined}
                  className="clickable block rounded-xl px-4 py-2 text-base"
                  style={r.week_ending === current ? { ...card, fontWeight: 700, borderColor: 'var(--color-primary, #2563eb)' } : card}
                >
                  Week ending {r.week_ending}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {current && (
        <section className="space-y-4" aria-labelledby="glance">
          <SectionTitle id="glance" icon={BarChart3} title={`The week in numbers: ${weekRange(current).from} to ${current}`} sub="Built from the decision ledger and the portfolios, so the results keep updating after the review was written." />
          <WeekGlance weekEnding={current} />
        </section>
      )}

      {review.data && (
        <section className="space-y-4" aria-labelledby="written">
          <SectionTitle id="written" icon={PenLine} title="The written review" sub={review.data.model ? `Written by ${review.data.model} on ${review.data.created_at.slice(0, 10)}, from that week's numbers.` : 'Numbers only (the model could not be reached).'} />
          <ReviewSections text={review.data.body_md ?? ''} />
        </section>
      )}
      {review.error && <p role="alert" style={{ color: '#D4501A' }}>{review.error}</p>}
    </div>
  )
}
