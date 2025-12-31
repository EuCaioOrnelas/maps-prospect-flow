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
      particleCount: Math.floor(200 * particleRatio),
    });
  }, []);

  const fireConfetti = useCallback(() => {
    // Fire multiple bursts for a more spectacular effect
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#10b981', '#059669', '#047857'],
    });

    fire(0.2, {
      spread: 60,
      colors: ['#fbbf24', '#f59e0b', '#d97706'],
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#8b5cf6', '#7c3aed', '#6d28d9'],
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#3b82f6', '#2563eb', '#1d4ed8'],
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#ec4899', '#db2777', '#be185d'],
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
    const end = Date.now() + 3 * 1000;
    const colors = ['#10b981', '#fbbf24', '#8b5cf6', '#3b82f6', '#ec4899'];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

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
