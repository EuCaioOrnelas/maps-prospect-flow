import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  trigger?: boolean;
  duration?: number;
}

export const useConfetti = () => {
  const fire = useCallback((particleRatio: number, opts: confetti.Options) => {
    confetti({
      origin: { y: 0.7 },
      ...opts,
      particleCount: Math.floor(50 * particleRatio), // Reduced from 200 to 50
    });
  }, []);

  const fireConfetti = useCallback(() => {
    // Subtle celebration effect
    fire(0.3, {
      spread: 60,
      startVelocity: 35,
      decay: 0.94,
      colors: ['#10b981', '#059669'],
    });

    fire(0.2, {
      spread: 80,
      decay: 0.93,
      scalar: 0.9,
      colors: ['#fbbf24', '#f59e0b'],
    });

    fire(0.2, {
      spread: 100,
      decay: 0.92,
      scalar: 0.8,
      colors: ['#8b5cf6', '#3b82f6'],
    });
  }, [fire]);

  const fireRealistic = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  const fireSides = useCallback(() => {
    const end = Date.now() + 1.5 * 1000; // Reduced from 3s to 1.5s
    const colors = ['#10b981', '#fbbf24', '#8b5cf6'];

    let frameCount = 0;
    (function frame() {
      frameCount++;
      // Only fire every 3rd frame to reduce particles
      if (frameCount % 3 === 0) {
        confetti({
          particleCount: 1,
          angle: 60,
          spread: 45,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 1,
          angle: 120,
          spread: 45,
          origin: { x: 1 },
          colors: colors,
        });
      }

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return { fireConfetti, fireRealistic, fireSides };
};

export const Confetti = ({ trigger = true, duration = 3000 }: ConfettiProps) => {
  const { fireConfetti, fireSides } = useConfetti();

  useEffect(() => {
    if (trigger) {
      // Initial burst
      fireConfetti();
      
      // Side confetti for ongoing celebration
      setTimeout(() => {
        fireSides();
      }, 500);
    }
  }, [trigger, fireConfetti, fireSides]);

  return null;
};

export default Confetti;
