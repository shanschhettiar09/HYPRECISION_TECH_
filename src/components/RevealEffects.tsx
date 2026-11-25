import React, { useEffect, useState } from 'react';

interface WordRevealProps {
  lines: string[];
  delay?: number;
  stagger?: number;
  duration?: number;
  fromY?: number;
  className?: string;
  lineClassName?: string;
}

/**
 * Word-by-word entrance reveal using easeOutCubic (cubic-bezier(0.215, 0.61, 0.355, 1)),
 * matching the Flowstate staggered hero reveal specification.
 */
export const WordReveal: React.FC<WordRevealProps> = ({
  lines,
  delay = 480,
  stagger = 85,
  duration = 720,
  fromY = 26,
  className = '',
  lineClassName = '',
}) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true);
      return;
    }
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  let wordIndex = 0;

  return (
    <span className={`inline-block ${className}`}>
      {lines.map((line, lIdx) => {
        const words = line.split(/\s+/).filter(Boolean);
        return (
          <span key={lIdx} className={`block ${lineClassName}`}>
            {words.map((word, wIdx) => {
              const idx = wordIndex++;
              const itemDelay = delay + idx * stagger;
              return (
                <React.Fragment key={`${lIdx}-${wIdx}`}>
                  <span
                    className="inline-block"
                    style={{
                      opacity: revealed ? 1 : 0,
                      transform: revealed ? 'translateY(0px)' : `translateY(${fromY}px)`,
                      transitionProperty: 'opacity, transform',
                      transitionDuration: `${duration}ms`,
                      transitionTimingFunction: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
                      transitionDelay: `${itemDelay}ms`,
                    }}
                  >
                    {word}
                  </span>
                  {wIdx < words.length - 1 ? ' ' : ''}
                </React.Fragment>
              );
            })}
          </span>
        );
      })}
    </span>
  );
};

interface StaggerBlockProps {
  children: React.ReactNode;
  delay?: number;
  fromY?: number;
  duration?: number;
  className?: string;
}

/**
 * Staggered block entrance matching the Flowstate soft spring curve cubic-bezier(0.2, 0, 0, 1).
 */
export const StaggerBlock: React.FC<StaggerBlockProps> = ({
  children,
  delay = 320,
  fromY = 20,
  duration = 700,
  className = '',
}) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true);
      return;
    }
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0px)' : `translateY(${fromY}px)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};
