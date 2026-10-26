import type { ComponentType } from 'react'
import type { Profile } from './data'
import { ArrowUp, ArrowUpRight, Mail, Rss } from 'lucide-react'
import { scrollToTop } from './useSmoothScroll'

interface FooterProps {
  profile: Profile
  socials: Array<{ name: string, url: string }>
  startYear: number
}

/** lucide v1 dropped brand icons, so GitHub keeps its own glyph. */
function GithubIcon({ size = 14 }: { size?: number, strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.55v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

const ICONS: Record<string, ComponentType<{ size?: number, strokeWidth?: number }>> = {
  GitHub: GithubIcon,
  RSS: Rss,
  Email: Mail,
}

export function Footer({ profile, socials, startYear }: FooterProps) {
  const year = new Date().getFullYear()
  const copyright = startYear === year ? `${year}` : `${startYear}—${year}`

  return (
    <footer
      className="relative overflow-hidden border-t px-6 pb-10 pt-20 md:pt-28"
      style={{ borderColor: 'var(--lp-line)' }}
    >
      <div className="relative z-10 mx-auto max-w-[1120px]">
        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div
              className="lp-mono text-[10px] tracking-[0.3em] uppercase"
              style={{ color: 'var(--lp-muted)' }}
            >
              Get in touch
            </div>
            <h2 className="mt-4 text-[clamp(2.1rem,5.6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              保持联系。
            </h2>
            <p
              className="mt-4 max-w-sm text-sm leading-relaxed"
              style={{ color: 'var(--lp-muted)' }}
            >
              代码、照片，或者只是一个想法，都可以写信给我。
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {socials.map((social) => {
              const Icon = ICONS[social.name] ?? ArrowUpRight
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  className="lp-hairline group inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[12px] transition-colors duration-300"
                  style={{ color: 'var(--lp-fg)' }}
                >
                  <Icon size={14} strokeWidth={1.6} />
                  {social.name}
                  <ArrowUpRight
                    size={12}
                    className="opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </a>
              )
            })}
          </div>
        </div>

        <div
          className="mt-16 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: 'var(--lp-line)' }}
        >
          <p
            className="lp-mono text-[9.5px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--lp-muted)' }}
          >
            ©
            {' '}
            {copyright}
            {' '}
            {profile.author}
            {' '}
            ·
            {' '}
            {profile.subtitle}
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="lp-mono group inline-flex items-center gap-2 text-[9.5px] tracking-[0.2em] uppercase"
            style={{ color: 'var(--lp-muted)' }}
          >
            回到顶部
            <span
              className="grid h-7 w-7 place-items-center border rounded-full transition-transform duration-300 group-hover:-translate-y-0.5"
              style={{ borderColor: 'var(--lp-line)' }}
            >
              <ArrowUp size={12} strokeWidth={1.8} />
            </span>
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="lp-mono pointer-events-none absolute left-1/2 w-full select-none text-center text-[24vw] font-semibold leading-none tracking-[-0.06em] -bottom-6 -translate-x-1/2"
        style={{ color: 'var(--lp-fg)', opacity: 0.028 }}
      >
        KUN
      </div>
    </footer>
  )
}
