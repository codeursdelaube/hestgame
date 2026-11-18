/**
 * components/NumberCard.tsx
 * Carte affichée après l'attribution du numéro
 */
"use client";

import { motion } from "framer-motion";
import { Star, Users } from "lucide-react";

interface NumberCardProps {
  number: number;
  team: number;
  firstName: string;
  lastName: string;
  gender: "Fille" | "Garçon";
}

// Noms d'équipes par défaut
const TEAM_NAMES = ["Alpha", "Bêta", "Gamma", "Delta", "Epsilon", "Zêta", "Êta", "Thêta"];

export default function NumberCard({
  number,
  team,
  firstName,
  lastName,
  gender,
}: NumberCardProps) {
  const teamName = TEAM_NAMES[team - 1] || `Équipe ${team}`;
  const isPink = gender === "Fille";

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      className="card-hest p-6 w-full max-w-sm mx-auto relative overflow-hidden"
    >
      {/* Ruban coloré en haut */}
      <div className="ribbon" />

      {/* Icône de genre */}
      <div className="flex justify-center mt-2 mb-4">
        <span className="text-5xl" role="img" aria-label={gender}>
          {isPink ? "🎀" : "🎗️"}
        </span>
      </div>

      {/* Nom */}
      <p className="text-center text-gray-600 text-sm font-medium mb-2">
        {firstName} {lastName}
      </p>

      {/* Numéro */}
      <div
        className="rounded-2xl py-6 mb-4 text-center"
        style={{
          background: isPink
            ? "linear-gradient(135deg, #D81B7A, #F06AAD)"
            : "linear-gradient(135deg, #1A3FA8, #3b5fc0)",
        }}
      >
        <p className="text-white text-xs font-semibold uppercase tracking-widest mb-1">
          Ton numéro
        </p>
        <p className="text-white font-black" style={{ fontSize: "5rem", lineHeight: 1 }}>
          {number}
        </p>
      </div>

      {/* Équipe */}
      <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl py-3 px-4">
        <Users size={16} className="text-gray-500" />
        <span className="text-gray-700 font-semibold text-sm">
          Équipe{" "}
          <span
            style={{
              color: isPink ? "#D81B7A" : "#1A3FA8",
              fontWeight: 800,
            }}
          >
            {teamName}
          </span>
        </span>
      </div>

      {/* Message d'encouragement */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1"
      >
        <Star size={12} className="text-yellow-400" />
        Bonne chance pour le tirage final !
        <Star size={12} className="text-yellow-400" />
      </motion.p>
    </motion.div>
  );
}
