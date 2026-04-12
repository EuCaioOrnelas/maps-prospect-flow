"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function FloatingPaths({
  position,
  className = "",
}: {
  position: number;
  className?: string;
}) {
  const paths = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    d: `M ${-120 + i * 14} ${54 + i * 20}
        C ${120 + position * (36 + i * 3)} ${88 + i * 12},
          ${320 + position * (78 + i * 3)} ${148 + i * 10},
          ${820 + position * (118 - i * 2)} ${214 + i * 14}`,
    width: 0.9 + i * 0.05,
    opacity: 0.035 + i * 0.006,
    duration: 7 + i * 0.35,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.svg
        className="h-full w-full text-primary"
        viewBox="0 0 900 620"
        fill="none"
        preserveAspectRatio="none"
        animate={{
          x: position > 0 ? [0, 18, 0] : [0, -18, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeLinecap="round"
            initial={{ pathLength: 0.18, opacity: 0 }}
            animate={{
              pathLength: [0.18, 1, 0.32],
              opacity: [path.opacity, path.opacity * 1.9, path.opacity],
            }}
            transition={{
              duration: path.duration,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: path.id * 0.08,
            }}
          />
        ))}
      </motion.svg>
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
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <FloatingPaths position={1} className="left-0 w-1/2 opacity-80" />
        <FloatingPaths position={-1} className="right-0 w-1/2 opacity-80" />
      </div>

      <div className="relative z-10 container mx-auto flex min-h-screen items-center justify-center px-4 text-center md:px-6">
        {children ? (
          children
        ) : (
          <motion.h1
            className="text-5xl font-bold tracking-tighter sm:text-7xl md:text-8xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="mr-4 inline-block last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={letterIndex}
                    initial={{ y: 36, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.08 + letterIndex * 0.025,
                      type: "spring",
                      stiffness: 180,
                      damping: 22,
                    }}
                    className="inline-block bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent"
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
