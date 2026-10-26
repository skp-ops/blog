import type { Profile } from './data'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

interface HeroProps {
  profile: Profile
}

export function Hero({ profile }: HeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Spring-smoothed progress: every value below inherits the damping.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
    restDelta: 0.0005,
  })

  const y = useTransform(smooth, [0, 1], [0, -120])
  const scale = useTransform(smooth, [0, 1], [1, 0.94])
  const opacity = useTransform(smooth, [0, 0.9], [1, 0])
  const glowY = useTransform(smooth, [0, 1], [0, 180])
  const glowOpacity = useTransform(smooth, [0, 1], [0.85, 0.25])

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative h-[100svh] flex items-center justify-center overflow-hidden"
    >
      <div className="h-full w-full flex items-center justify-center">
        {/* ── background ─────────────────────────────────────────────── */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute left-1/2 top-[-18%] h-[78vh] w-[86vw] rounded-full blur-[110px] -translate-x-1/2"
            style={{
              y: glowY,
              opacity: glowOpacity,
              background:
                'radial-gradient(50% 50% at 50% 50%, var(--lp-glow) 0%, transparent 72%)',
            }}
          />
          <div className="lp-grid absolute inset-0 opacity-40" />
          <div
            className="absolute inset-x-0 bottom-0 h-56"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--lp-bg))' }}
          />
        </div>

        {/* ── content ────────────────────────────────────────────────── */}
        <motion.div
          style={{ y, scale, opacity }}
          className="relative z-10 mx-auto max-w-[1120px] w-full px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="flex justify-center"
          >
            <span className="lp-chip lp-mono">
              <span
                className="lp-dot-pulse h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--lp-accent)' }}
              />
              {profile.eyebrow}
            </span>
          </motion.div>

          <h1 className="mt-9 text-[clamp(2.7rem,7.9vw,6.9rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
            {profile.heroLines.map((line, index) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  className="block"
                  initial={{ y: '112%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.15, delay: 0.1 + index * 0.1, ease: EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.38, ease: EASE }}
            className="mx-auto mt-7 max-w-[30rem] text-[15px] leading-relaxed md:text-base"
            style={{ color: 'var(--lp-muted)' }}
          >
            {profile.heroSub}
          </motion.p>

        </motion.div>

        {/* ── scroll hint ────────────────────────────────────────────── */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
          style={{ opacity }}
        >
          <span className="lp-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: 'var(--lp-muted)' }}>
            Scroll
          </span>
          <div className="lp-scroll-hint" />
        </motion.div>
      </div>
    </section>
  )
}
