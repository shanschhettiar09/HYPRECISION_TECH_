import { useEffect, useState, RefObject } from 'react';
import Lenis from 'lenis';

let sharedLenis: Lenis | null = null;
let rafId: number | null = null;

export function startSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return () => {};

  if (!sharedLenis) {
    sharedLenis = new Lenis({ smoothWheel: true });
    const raf = (time: number) => {
      sharedLenis?.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
  }

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    sharedLenis?.destroy();
    sharedLenis = null;
  };
}

export function setSmoothScrollPaused(paused: boolean) {
  if (!sharedLenis) return;
  if (paused) {
    sharedLenis.stop();
  } else {
    sharedLenis.start();
  }
}

export function useInViewGate(
  ref: RefObject<HTMLElement | null>,
  rootMargin = '0px 0px -10% 0px'
): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || entered) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setEntered(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, entered]);

  return entered;
}
