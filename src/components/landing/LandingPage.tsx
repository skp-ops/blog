import type { Article, Profile } from './data'
import { MotionConfig } from 'framer-motion'
import { Articles } from './Articles'
import { Bio } from './Bio'
import { Footer } from './Footer'
import { Hero } from './Hero'
import { Navbar } from './Navbar'
import { Photography } from './Photography'
import { useSmoothScroll } from './useSmoothScroll'

export interface LandingProps {
  profile: Profile
  articles?: Article[]
  socials: Array<{ name: string, url: string }>
  startYear: number
}

/**
 * Flips the site-wide theme exactly the way Button.astro does on the rest of
 * the blog: same html class, same localStorage key, same `theme-changed` event.
 * Every colour on this page comes from CSS variables, so nothing has to be
 * re-rendered — and the choice survives navigation to any other page.
 */
function toggleSiteTheme() {
  const root = document.documentElement
  const isDark = !root.classList.contains('dark')

  root.classList.toggle('dark', isDark)
  window.localStorage.setItem('theme', isDark ? 'dark' : 'light')
  document.dispatchEvent(new Event('theme-changed'))

  const meta = document.head.querySelector('meta[name="theme-color"]')
  const landing = document.querySelector('.lp')
  if (meta && landing) {
    const bg = getComputedStyle(landing).getPropertyValue('--lp-bg').trim()
    if (bg) {
      meta.setAttribute('content', bg)
    }
  }
}

export default function LandingPage({ profile, articles, socials, startYear }: LandingProps) {
  useSmoothScroll()

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp">
        <Navbar onToggleMode={toggleSiteTheme} profile={profile} />

        {/* Content sliding under the floating navbar fades out instead of being cut. */}
        <div aria-hidden className="lp-top-veil" />

        <main>
          <Hero profile={profile} />
          <Bio />
          <Photography />
          <Articles articles={articles} />
        </main>

        <Footer profile={profile} socials={socials} startYear={startYear} />
        <div className="lp-grain" aria-hidden />
      </div>
    </MotionConfig>
  )
}
