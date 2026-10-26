import type { MotionValue } from 'framer-motion'
import type { Photo } from './data'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { PHOTOS } from './data'
import { SectionMeta } from './SectionMeta'

interface PhotoCardProps {
  photo: Photo
  index: number
  total: number
  progress: MotionValue<number>
}

function PhotoCard({ photo, index, total, progress }: PhotoCardProps) {
  // Each card drifts inside its own slice of the horizontal timeline.
  const sliceStart = index * (0.85 / total)
  const sliceEnd = Math.min(1, sliceStart + 0.6)
  const isLast = index === total - 1

  // The drift stays inside the zoom envelope (5% shift vs. 6% overflow at
  // scale 1.12), so the frame can never show a gap. The last card settles
  // back to 0 instead of parking off-centre.
  const imageX = useTransform(progress, [sliceStart, sliceEnd], ['-5%', isLast ? '0%' : '5%'])
  const imageScale = useTransform(progress, [sliceStart, sliceEnd], [1.14, 1.12])

  // The opening frame grows from 85% to its natural size.
  const cardScale = useTransform(progress, [0, 0.16], [index === 0 ? 0.85 : 1, 1])

  return (
    <motion.figure
      className="group relative h-[54vh] max-w-[920px] w-[78vw] shrink-0 overflow-hidden rounded-[26px] will-change-transform lg:w-[54vw] md:h-[58vh] sm:w-[64vw]"
      style={{ border: '1px solid var(--lp-line)', scale: cardScale, background: 'var(--lp-surface)' }}
    >
      <div className="absolute inset-0 overflow-hidden transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]">
        <motion.img
          src={photo.src}
          alt={photo.alt}
          draggable={false}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ x: imageX, scale: imageScale }}
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.2) 46%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 md:p-6">
        <span className="lp-mono text-[10px] text-white/70 tracking-[0.24em]">
          {`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
        </span>
        <span className="lp-mono text-[9px] text-white/50 tracking-[0.22em]">{photo.coord}</span>
      </div>

      <figcaption className="absolute inset-x-0 bottom-0 p-5 pb-6 text-white md:p-8">
        <h3 className="text-[clamp(1.5rem,2.5vw,2.25rem)] font-semibold tracking-[-0.025em]">
          {photo.title}
        </h3>
        <div className="lp-mono mt-2.5 text-[9.5px] text-white/70 leading-relaxed tracking-[0.08em] md:text-[10.5px] md:tracking-[0.12em]">
          {photo.location}
          <span className="mx-2 text-white/35">/</span>
          {photo.focal}
          {' · '}
          {photo.aperture}
          {' · '}
          {photo.shutter}
          {' · '}
          {photo.iso}
        </div>
      </figcaption>
    </motion.figure>
  )
}

export function Photography() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [distance, setDistance] = useState(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Low stiffness + high mass = the track feels heavy and settles late.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 58,
    damping: 22,
    mass: 0.6,
    restDelta: 0.0004,
  })

  const x = useTransform(smooth, [0, 1], [0, -distance])

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track) {
        return
      }
      const width = track.getBoundingClientRect().width
      setDistance(Math.max(0, Math.round(width - document.documentElement.clientWidth)))
    }

    measure()
    const raf = requestAnimationFrame(measure)
    const timer = window.setTimeout(measure, 900)

    window.addEventListener('resize', measure)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <section ref={sectionRef} id="photography" className="relative h-[350vh]">
      <div className="sticky top-0 h-[100svh] flex flex-col overflow-hidden">
        {/* ── section header ─────────────────────────────────────────── */}
        <div className="relative z-10 mx-auto max-w-[1120px] w-full flex items-end justify-between px-6 pt-24 md:pt-28">
          <SectionMeta index="02" label="Photography / 摄影" />
          <div
            className="lp-mono hidden text-right text-[10px] leading-relaxed tracking-[0.22em] uppercase md:block"
            style={{ color: 'var(--lp-muted)' }}
          >
            <div>
              {`${String(PHOTOS.length).padStart(2, '0')} Frames`}
            </div>
            <div>2024 — 2026</div>
          </div>
        </div>

        {/* ── horizontal track ───────────────────────────────────────── */}
        <div className="relative flex flex-1 items-center">
          <motion.div
            ref={trackRef}
            style={{ x }}
            className="w-max flex items-center gap-[4vw] px-[8vw] will-change-transform"
          >
            {PHOTOS.map((photo, index) => (
              <PhotoCard
                key={photo.title}
                photo={photo}
                index={index}
                total={PHOTOS.length}
                progress={smooth}
              />
            ))}
          </motion.div>
        </div>

        {/* ── progress / hint ────────────────────────────────────────── */}
        <div className="mx-auto max-w-[1120px] w-full flex items-center justify-between px-6 pb-8">
          <div className="flex items-center gap-4">
            <div className="h-px w-28 overflow-hidden md:w-40" style={{ background: 'var(--lp-line)' }}>
              <motion.div
                className="h-full origin-left"
                style={{ scaleX: smooth, background: 'var(--lp-fg)' }}
              />
            </div>
            <span
              className="lp-mono text-[9px] tracking-[0.28em] uppercase"
              style={{ color: 'var(--lp-muted)' }}
            >
              Scroll to explore
            </span>
          </div>

          <span
            className="lp-mono hidden text-[9px] tracking-[0.28em] uppercase md:block"
            style={{ color: 'var(--lp-muted)' }}
          >
            Moved by light
          </span>
        </div>
      </div>
    </section>
  )
}
