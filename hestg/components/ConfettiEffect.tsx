/**
 * components/ConfettiEffect.tsx
 * Lance des confettis rose et bleu HEST via canvas-confetti
 */
"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiEffectProps {
  trigger: boolean;
  /** "normal" = participant, "winner" = tirage final (plus intense) */
  mode?: "normal" | "winner";
}

export default function ConfettiEffect({
  trigger,
  mode = "normal",
}: ConfettiEffectProps) {
  useEffect(() => {
    if (!trigger) return;

    const colors = ["#D81B7A", "#1A3FA8", "#F06AAD", "#3b5fc0", "#ffffff"];

    if (mode === "winner") {
      // Tirage final : feux d'artifice
      const duration = 5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else {
      // Participant : simple pluie de confettis
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors,
      });
    }
  }, [trigger, mode]);

  return null; // Pas de rendu DOM
}
