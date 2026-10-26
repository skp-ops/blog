import type { MotionValue } from 'framer-motion'
import type { Article } from './data'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ARTICLES } from './data'
import { SectionMeta } from './SectionMeta'

const STICKY_BASE = 96
const STICKY_STEP = 18

const stickyTop = (index: number) => STICKY_BASE + index * STICKY_STEP

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

interface ArticleCardProps {
  article: Article
  index: number
  total: number
  progress: MotionValue<number>
  range: [number, number]
  cardRef: (element: HTMLAnchorElement | null) => void
}

function ArticleCard({ article, index, total, progress, range, cardRef }: ArticleCardProps) {
  const isLast = index === total - 1

  // As the next card slides up, this one recedes: scale 1 -> 0.96 and dims.
  const scale = useTransform(progress, range, [1, isLast ? 1 : 0.96])
  const y = useTransform(progress, range, [0, isLast ? 0 : -8])
  // Dim with an inner scrim instead of animating opacity, so the card stays
  // opaque and the cards underneath never bleed through it.
  const scrim = useTransform(progress, range, [0, isLast ? 0 : 0.62])

  return (
    <motion.a
      ref={cardRef}
      href={article.href}
      className="lp-card lp-article group relative block overflow-hidden rounded-[30px] p-7 will-change-transform md:px-12 md:py-11"
      style={{
        position: 'sticky',
        top: stickyTop(index),
        scale,
        y,
        zIndex: index + 1,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in oklab, var(--lp-fg) 30%, transparent), transparent)',
        }}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className="lp-mono text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'var(--lp-muted)' }}
        >
          {article.date}
        </span>
        <span className="lp-tag lp-mono">{article.tag}</span>
        <span
          className="lp-mono ml-auto text-[10px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--lp-muted)' }}
        >
          {article.readingTime}
        </span>
      </div>

      <h3 className="mt-6 max-w-[46rem] text-[clamp(1.55rem,3.2vw,2.55rem)] font-semibold leading-[1.14] tracking-[-0.03em]">
        {article.title}
      </h3>

      <p
        className="line-clamp-2 mt-4 max-w-[36rem] text-[13.5px] leading-[1.75]"
        style={{ color: 'var(--lp-muted)' }}
      >
        {article.excerpt}
      </p>

      <div
        className="mt-7 flex items-center justify-between border-t pt-5"
        style={{ borderColor: 'var(--lp-line)' }}
      >
        <span
          className="lp-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--lp-muted)' }}
        >
          阅读全文
        </span>
        <span
          className="grid h-10 w-10 place-items-center border rounded-full transition-transform duration-500 ease-out group-hover:translate-x-1.5"
          style={{ borderColor: 'var(--lp-line)' }}
        >
          <ArrowUpRight size={16} strokeWidth={1.6} />
        </span>
      </div>

      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{ opacity: scrim, background: 'var(--lp-bg)' }}
      />
    </motion.a>
  )
}

interface ArticlesProps {
  articles?: Article[]
}

export function Articles({ articles = ARTICLES }: ArticlesProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([])

  const [ranges, setRanges] = useState<Array<[number, number]>>(() =>
    articles.map((_, index) => [
      index / articles.length,
      (index + 1) / articles.length,
    ]),
  )

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.35,
    restDelta: 0.0004,
  })

  /**
   * The cards are sticky siblings inside the section, so their stacking is pure
   * CSS. We only need to know *when* each next card reaches the previous one —
   * that scroll offset is measured from the natural (un-stuck) flow, using the
   * card heights plus the flex gap.
   */
  useEffect(() => {
    const compute = () => {
      const section = sectionRef.current
      const list = listRef.current
      if (!section || !list) {
        return
      }

      const scrollRange = section.offsetHeight - window.innerHeight
      if (scrollRange <= 0) {
        return
      }

      const listTop = list.offsetTop
      const gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0
      let cursor = 0

      const next = articles.map((_, index) => {
        const card = cardRefs.current[index]
        if (!card) {
          return [index / articles.length, (index + 1) / articles.length] as [number, number]
        }

        const naturalTop = listTop + cursor
        const height = card.offsetHeight
        const start = clamp01((naturalTop - stickyTop(index)) / scrollRange)
        const followingTop = naturalTop + height + gap
        const end = index === articles.length - 1
          ? 1
          : clamp01((followingTop - stickyTop(index)) / scrollRange)

        cursor += height + gap

        return [start, Math.max(start + 0.001, end)] as [number, number]
      })

      setRanges(next)
    }

    compute()

    const observer = new ResizeObserver(compute)
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    window.addEventListener('resize', compute)
    window.addEventListener('load', compute)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', compute)
      window.removeEventListener('load', compute)
    }
  }, [articles])

  return (
    <section
      ref={sectionRef}
      id="articles"
      className="relative mx-auto max-w-[1120px] w-full px-6 pb-28 pt-[14vh] md:pb-36"
    >
      <div className="flex items-end justify-between gap-8">
        <SectionMeta
          index="03"
          label="Writing / 文章"
          title="最新文章"
          description="记录代码、工具与日常思考，偶尔也拍点照片。"
        />

        <a
          href="/timeline/"
          className="lp-mono group hidden shrink-0 items-center gap-2 pb-2 text-[10px] tracking-[0.22em] uppercase transition-opacity md:inline-flex hover:opacity-70"
          style={{ color: 'var(--lp-muted)' }}
        >
          全部文章
          <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
        </a>
      </div>

      <div ref={listRef} className="mt-14 flex flex-col gap-6 md:mt-16 md:gap-8">
        {articles.map((article, index) => (
          <ArticleCard
            key={article.title}
            article={article}
            index={index}
            total={articles.length}
            progress={smooth}
            range={ranges[index]}
            cardRef={(element) => {
              cardRefs.current[index] = element
            }}
          />
        ))}
      </div>
    </section>
  )
}
