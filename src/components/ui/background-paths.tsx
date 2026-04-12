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
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        className="absolute w-[140%] h-[140%] -left-[10%] -bottom-[20%]"
        viewBox="-400 -300 1500 900"
        fill="none"
        preserveAspectRatio="xMinYMax slice"
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            fill="none"
            stroke={`rgba(34,197,94,${0.025 + path.id * 0.006})`}
            strokeWidth={path.width}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              isVisible
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{
              pathLength: {
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
              },
              opacity: {
                duration: 0.6,
                delay: path.id * 0.04,
              },
            }}
          />
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
