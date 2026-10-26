import type { Profile } from './data'
import { motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import { Moon, Rss, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { scrollToId, scrollToTop } from './useSmoothScroll'

const LINKS = [
  { id: 'bio', label: '简介' },
  { id: 'photography', label: '摄影' },
  { id: 'articles', label: '文章' },
]

interface NavbarProps {
  onToggleMode: () => void
  profile: Profile
}

/** Highlights the section currently sitting in the middle of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        })
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: 0 },
    )

    ids.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [ids])

  return active
}

export function Navbar({ onToggleMode, profile }: NavbarProps) {
  const { scrollY, scrollYProgress } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const active = useActiveSection(LINKS.map(link => link.id))

  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.0005 })

  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 24)
  })

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
        style={{ scaleX: progress, background: 'var(--lp-accent)' }}
      />

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
        <div
          className="lp-nav mx-auto h-13 max-w-[1120px] w-full flex items-center rounded-full pr-2 md:h-14 md:pr-2.5"
          data-scrolled={scrolled}
        >
          <button
            type="button"
            onClick={scrollToTop}
            className="flex shrink-0 items-center gap-2.5 py-1 pl-3 pr-3 md:pl-4"
            aria-label="回到顶部"
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold tracking-tight"
              style={{ background: 'var(--lp-fg)', color: 'var(--lp-bg)' }}
            >
              K
            </span>
            <span className="hidden text-[11px] font-medium tracking-[0.22em] uppercase sm:block">
              {profile.title}
            </span>
          </button>

          <nav aria-label="页面导航" className="ml-auto flex items-center gap-0.5">
            {LINKS.map(link => (
              <button
                key={link.id}
                type="button"
                className="lp-nav-item"
                data-active={active === link.id}
                onClick={() => scrollToId(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-3">
            <a
              href="/rss.xml"
              aria-label="订阅 RSS"
              className="lp-icon-btn hidden sm:grid"
              target="_blank"
              rel="noreferrer"
            >
              <Rss size={15} strokeWidth={1.6} />
            </a>

            <button
              type="button"
              onClick={onToggleMode}
              aria-label="切换深浅色主题"
              className="lp-icon-btn"
            >
              {/* Both icons live in the DOM; the html.dark class decides which one is shown. */}
              <span className="lp-theme-icon">
                <Sun size={15} strokeWidth={1.6} className="lp-sun" />
                <Moon size={15} strokeWidth={1.6} className="lp-moon" />
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
