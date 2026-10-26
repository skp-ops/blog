import type { MotionValue } from 'framer-motion'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useMemo, useRef } from 'react'
import { BIO_SENTENCES, PROFILE } from './data'
import { SectionMeta } from './SectionMeta'

interface ScrubWordProps {
  progress: MotionValue<number>
  start: number
  end: number
  children: string
}

/** One token of the bio: lights up from 15% to 100% inside its own window. */
function ScrubWord({ progress, start, end, children }: ScrubWordProps) {
  const opacity = useTransform(progress, [start, end], [0.15, 1])
  return (
    <motion.span style={{ opacity }} className="whitespace-pre-wrap">
      {children}
    </motion.span>
  )
}

export function Bio() {
  const sectionRef = useRef<HTMLElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const smooth = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 26,
    mass: 0.5,
    restDelta: 0.0005,
  })

  // 45 tokens share a 0..0.9 timeline, each one fades in over a 0.16 window.
  const sentences = useMemo(() => {
    const total = BIO_SENTENCES.reduce((sum, sentence) => sum + sentence.length, 0)
    const step = 0.9 / total
    let cursor = 0
    return BIO_SENTENCES.map(sentence =>
      sentence.map((word) => {
        const start = cursor * step
        cursor += 1
        return { word, start, end: Math.min(1, start + 0.16) }
      }),
    )
  }, [])

  const haloY = useTransform(smooth, [0, 1], [70, -70])
  const cardY = useTransform(smooth, [0, 1], [40, -60])
  const spin = useTransform(smooth, [0, 1], [-24, 28])
  const spinReverse = useTransform(smooth, [0, 1], [18, -34])
  const glowScale = useTransform(smooth, [0, 1], [0.9, 1.15])

  return (
    <section ref={sectionRef} id="bio" className="relative h-[250vh]">
      <div className="sticky top-0 h-[100svh] flex items-center overflow-hidden">
        <div className="grid grid-cols-1 mx-auto max-w-[1120px] w-full items-center gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
          {/* ── text scrub ─────────────────────────────────────────── */}
          <div>
            <SectionMeta index="01" label="About / 简介" />

            <div className="mt-8 max-w-[45rem] text-[clamp(1.35rem,2.9vw,2.5rem)] font-medium leading-[1.5] tracking-[-0.02em]">
              {sentences.map((sentence, index) => (
                <p key={index} className={index === 0 ? '' : 'mt-4'}>
                  {sentence.map((token, tokenIndex) => (
                    <ScrubWord
                      key={`${token.start}-${tokenIndex}`}
                      progress={smooth}
                      start={token.start}
                      end={token.end}
                    >
                      {token.word}
                    </ScrubWord>
                  ))}
                </p>
              ))}
            </div>

            <div
              className="lp-mono mt-9 flex items-center gap-3 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--lp-muted)' }}
            >
              <span>Now</span>
              <span className="h-px w-6" style={{ background: 'var(--lp-line)' }} />
              <span style={{ color: 'var(--lp-fg)' }}>{PROFILE.now}</span>
            </div>
          </div>

          {/* ── geometric halo + profile card ──────────────────────── */}
          <div aria-hidden className="relative hidden h-[520px] items-center justify-center lg:flex">
            <motion.div
              className="absolute h-[420px] w-[420px] rounded-full blur-[70px]"
              style={{
                y: haloY,
                scale: glowScale,
                background:
                  'radial-gradient(50% 50% at 50% 50%, var(--lp-glow) 0%, transparent 70%)',
              }}
            />

            <motion.div
              className="absolute h-[440px] w-[440px] rounded-full"
              style={{
                y: haloY,
                rotate: spin,
                background:
                  'conic-gradient(from 90deg, transparent 0deg, var(--lp-accent) 55deg, transparent 120deg)',
                WebkitMask:
                  'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.2px))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.2px))',
                opacity: 0.7,
              }}
            />

            <motion.div
              className="absolute h-[348px] w-[348px] border rounded-full border-dashed"
              style={{ borderColor: 'var(--lp-line)', rotate: spinReverse }}
            />

            <motion.div
              className="lp-tilt-card lp-hairline relative w-[286px] rounded-[28px] p-6"
              style={{ y: cardY, boxShadow: 'var(--lp-shadow)' }}
            >
              <div className="flex items-center gap-3">
                <img
                  src="/icons/head.png"
                  alt={PROFILE.author}
                  className="h-11 w-11 rounded-2xl object-cover"
                  style={{ border: '1px solid var(--lp-line)' }}
                />
                <div>
                  <div className="text-[13px] font-medium">{PROFILE.author}</div>
                  <div
                    className="lp-mono text-[9px] tracking-[0.2em] uppercase"
                    style={{ color: 'var(--lp-muted)' }}
                  >
                    Compiler · Photo
                  </div>
                </div>
              </div>

              <dl className="lp-mono mt-6 text-[10.5px] space-y-2.5">
                {[
                  ['focus', 'IR · Runtime'],
                  ['gear', 'X-T5 · 35mm f/1.4'],
                  ['status', 'writing'],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <dt className="tracking-[0.16em] uppercase" style={{ color: 'var(--lp-muted)' }}>
                      {key}
                    </dt>
                    <dd className="tracking-[0.04em]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 h-px" style={{ background: 'var(--lp-line)' }} />

              <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: 'var(--lp-muted)' }}>
                {PROFILE.cardNote}
              </p>

              <div className="mt-5 flex items-center gap-2">
                <span
                  className="lp-dot-pulse h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--lp-accent)' }}
                />
                <span
                  className="lp-mono text-[9px] tracking-[0.2em] uppercase"
                  style={{ color: 'var(--lp-muted)' }}
                >
                  Since 2021
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
