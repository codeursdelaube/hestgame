/**
 * components/HESTHeader.tsx
 * En-tête commun avec logo, rubans décoratifs et titre de l'événement
 */
"use client";

import { motion } from "framer-motion";

interface HESTHeaderProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function HESTHeader({
  title = "HESTGame",
  subtitle = "Octobre Rose & Novembre Bleu",
  compact = false,
}: HESTHeaderProps) {
  return (
    <header className="relative w-full bg-white shadow-sm overflow-hidden">
      {/* Ruban rose/bleu en haut */}
      <div className="ribbon" />

      <div
        className={`flex flex-col items-center justify-center ${
          compact ? "py-4 gap-1" : "py-8 gap-2"
        }`}
      >
        {/* Icônes de rubans décoratifs */}
        <div className="flex items-center gap-3">
          {/* Ruban rose */}
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl"
            aria-hidden="true"
          >
            🎀
          </motion.span>

          {/* Titre principal */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`font-black gradient-title ${
              compact ? "text-2xl" : "text-4xl sm:text-5xl"
            }`}
          >
            {title}
          </motion.h1>

          {/* Ruban bleu */}
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl"
            aria-hidden="true"
          >
            🎗️
          </motion.span>
        </div>

        {/* Sous-titre */}
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className={`text-center font-medium text-gray-500 ${
              compact ? "text-xs" : "text-sm sm:text-base"
            }`}
          >
            {subtitle}
          </motion.p>
        )}

        {/* Badge HEST */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-white px-3 py-1 rounded-full font-semibold"
          style={{ background: "linear-gradient(90deg, #D81B7A, #1A3FA8)" }}
        >
          HEST – Lomé, Togo
        </motion.span>
      </div>
    </header>
  );
}
