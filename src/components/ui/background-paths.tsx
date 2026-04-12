"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface FloatingPathsProps {
  position: number;
  isVisible?: boolean;
  className?: string;
}

export function FloatingPaths({
  position,
  isVisible = true,
  className = "",
}: FloatingPathsProps) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    baseOpacity: 0.03 + i * 0.004,
    highlightOpacity: 0.12 + i * 0.007,
    revealDuration: 0.9 + i * 0.03,
    flowDuration: 5.2 + i * 0.14,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        className="h-full w-full"
        viewBox="-400 -300 1500 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <g key={path.id}>
            <motion.path
              d={path.d}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={path.width}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                isVisible
                  ? { pathLength: 1, opacity: path.baseOpacity }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{
                duration: path.revealDuration,
                delay: path.id * 0.03,
                ease: "easeOut",
              }}
            />

            <motion.path
              d={path.d}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={path.width + 0.16}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0.16, pathSpacing: 0.84, pathOffset: 0, opacity: 0 }}
              animate={
                isVisible
                  ? {
                      pathLength: 0.2,
                      pathSpacing: 0.8,
                      pathOffset: 1,
                      opacity: path.highlightOpacity,
                    }
                  : {
                      opacity: 0,
                      pathOffset: 0,
                    }
              }
              transition={{
                opacity: {
                  duration: 0.25,
                  delay: 0.35 + path.id * 0.02,
                  ease: "easeOut",
                },
                pathLength: { duration: 0 },
                pathSpacing: { duration: 0 },
                pathOffset: {
                  duration: path.flowDuration,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 0.35 + path.id * 0.04,
                },
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths({
  title = "Background Paths",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  const words = title.split(" ");

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        {children ?? (
          <motion.h1
            className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-4 last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={letterIndex}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03,
                      type: "spring",
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </motion.h1>
        )}
      </div>
    </div>
  );
}
