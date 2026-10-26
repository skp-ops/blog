import Lenis from 'lenis'
import { useEffect } from 'react'

/**
 * One Lenis instance per page, shared by the navbar / footer anchors.
 * Lenis keeps native scroll position (it does not transform a wrapper),
 * so Framer Motion's useScroll stays in sync for free.
 */
let lenis: Lenis | null = null

export function useSmoothScroll() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      return
    }

    const instance = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
      syncTouch: false,
    })

    lenis = instance

    let frame = 0
    const raf = (time: number) => {
      instance.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      instance.destroy()
      lenis = null
    }
  }, [])
}

export function scrollToId(id: string, offset = -88) {
  const target = document.getElementById(id)
  if (!target) {
    return
  }

  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.4 })
    return
  }

  const top = target.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top, behavior: 'smooth' })
}

export function scrollToTop() {
  if (lenis) {
    lenis.scrollTo(0, { duration: 1.5 })
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
