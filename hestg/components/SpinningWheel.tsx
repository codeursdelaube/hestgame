/**
 * components/SpinningWheel.tsx
 * Roue de fortune animée avec Framer Motion
 * Segments alternés rose/bleu HEST, flèche en haut
 */
"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface SpinningWheelProps {
  /** Rotation finale en degrés (calculée pour s'arrêter sur le bon segment) */
  finalRotation: number;
  /** Nombre de segments affichés sur la roue */
  segments?: number;
  /** Si true, la roue tourne. Sinon, elle est statique. */
  isSpinning: boolean;
  /** Callback déclenché à la fin de l'animation */
  onComplete?: () => void;
  /** Taille en px */
  size?: number;
}

const HEST_PINK = "#D81B7A";
const HEST_BLUE = "#1A3FA8";

export default function SpinningWheel({
  finalRotation,
  segments = 12,
  isSpinning,
  onComplete,
  size = 280,
}: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dessin du canvas de la roue (statique, les segments)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;
    const arcSize = (2 * Math.PI) / segments;

    // Efface et dessine chaque segment
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < segments; i++) {
      const startAngle = i * arcSize - Math.PI / 2;
      const endAngle = startAngle + arcSize;

      // Couleur alternée rose/bleu
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? HEST_PINK : HEST_BLUE;
      ctx.fill();

      // Bordure blanche entre segments
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Numéro du segment (optionnel, décoratif)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.translate(radius * 0.65, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "white";
      ctx.font = `bold ${size / 20}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), 0, 0);
      ctx.restore();
    }

    // Cercle central
    ctx.beginPath();
    ctx.arc(cx, cy, size / 10, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Logo central
    ctx.fillStyle = HEST_PINK;
    ctx.font = `bold ${size / 14}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", cx, cy);
  }, [segments, size]);

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Flèche fixe pointant vers le bas (indique le résultat en haut) */}
      <div
        className="absolute z-10"
        style={{ top: -18, left: "50%", transform: "translateX(-50%)" }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          <polygon
            points="14,28 2,2 26,2"
            fill={HEST_PINK}
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Roue animée */}
      <motion.div
        animate={
          isSpinning
            ? { rotate: finalRotation }
            : { rotate: 0 }
        }
        transition={
          isSpinning
            ? {
                duration: 4.5,
                ease: [0.17, 0.67, 0.35, 1.0], // ease-out personnalisé
              }
            : { duration: 0 }
        }
        onAnimationComplete={() => {
          if (isSpinning && onComplete) onComplete();
        }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          boxShadow:
            "0 8px 32px rgba(216,27,122,0.25), 0 2px 8px rgba(26,63,168,0.15)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{ borderRadius: "50%", display: "block" }}
        />
      </motion.div>
    </div>
  );
}
