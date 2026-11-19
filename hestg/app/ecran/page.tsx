/**
 * app/ecran/page.tsx
 * Écran de projection (vidéoprojecteur) — Plein écran
 * Polling toutes les 3 secondes
 * Affiche les stats en direct, puis le tirage final avec compte à rebours
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Ribbon,
  Trophy,
  Star,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
} from "lucide-react";
import SpinningWheel from "@/components/SpinningWheel";
import ConfettiEffect from "@/components/ConfettiEffect";

interface ScreenData {
  count: number;
  maxNumber: number;
  drawOpen: boolean;
  openTime?: string;
  closedMessage?: string;
  latest: {
    firstName: string;
    lastName: string;
    gender: string;
    number: number;
    team: number;
    createdAt: string;
  } | null;
  winner: {
    number: number;
    drawnAt: string;
    firstName: string;
    lastName: string;
    gender: string;
    filiere?: string;
  } | null;
}

const TEAM_NAMES = ["Alpha", "Bêta", "Gamma", "Delta", "Epsilon", "Zêta", "Êta", "Thêta"];

type ScreenState = "idle" | "countdown" | "spinning" | "revealed";

export default function EcranPage() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [countdown, setCountdown] = useState(5);
  const [spinRotation, setSpinRotation] = useState(0);
  const [displayedWinner, setDisplayedWinner] = useState<ScreenData["winner"]>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const prevWinnerId = useRef<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling de l'API screen ──
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/screen");
      if (!res.ok) { setIsConnected(false); return; }
      const json: ScreenData = await res.json();
      setData(json);
      setIsConnected(true);

      const winnerId = json.winner
        ? `${json.winner.number}-${json.winner.drawnAt}`
        : null;

      if (winnerId && winnerId !== prevWinnerId.current && screenState === "idle") {
        prevWinnerId.current = winnerId;
        startWinnerSequence(json.winner!);
      }
    } catch {
      setIsConnected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Séquence de révélation du gagnant ──
  const startWinnerSequence = (winner: NonNullable<ScreenData["winner"]>) => {
    setScreenState("countdown");
    setCountdown(5);

    let count = 5;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        setSpinRotation(3 * 360 + Math.random() * 360);
        setScreenState("spinning");

        setTimeout(() => {
          setDisplayedWinner(winner);
          setScreenState("revealed");
          setShowConfetti(true);
        }, 5000);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Plein écran ──
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!data) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #14246B 0%, #D81B7A 100%)" }}
      >
        <div className="text-white text-2xl font-bold animate-pulse flex items-center gap-3">
          <Wifi size={28} className="animate-pulse" />
          Connexion…
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh relative overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(135deg, #14246B 0%, #1A3FA8 50%, #D81B7A 100%)" }}
    >
      <ConfettiEffect trigger={showConfetti} mode="winner" />

      {/* Cercles décoratifs flottants */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/4 right-10 w-48 h-48 rounded-full bg-pink-500/10" />
      </div>

      {/* ── Barre de statut (haut) ── */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        {/* Indicateur connexion */}
        <div
          className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border backdrop-blur-sm ${
            isConnected
              ? "text-emerald-200 border-emerald-400/30 bg-emerald-500/20"
              : "text-red-200 border-red-400/30 bg-red-500/20"
          }`}
        >
          {isConnected
            ? <Wifi size={12} />
            : <WifiOff size={12} />
          }
          <span>{isConnected ? "En direct" : "Reconnexion…"}</span>
        </div>

        {/* Bouton plein écran */}
        <button
          onClick={toggleFullscreen}
          className="text-white/60 hover:text-white text-xs px-3 py-1 rounded-full border border-white/20 hover:border-white/40 transition-colors flex items-center gap-1.5"
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {isFullscreen ? "Réduire" : "Plein écran"}
        </button>
      </div>

      {/* ── ÉTAT IDLE : Affichage des stats ── */}
      <AnimatePresence mode="wait">
        {screenState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6 sm:px-8 py-16 gap-6 sm:gap-8"
          >
            {/* Titre */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                <Ribbon size={36} className="text-[#F06AAD]" strokeWidth={1.5} />
                <h1
                  className="font-black text-white"
                  style={{ fontSize: "clamp(2.5rem, 10vw, 6rem)" }}
                >
                  HESTGame
                </h1>
                <Ribbon size={36} className="text-[#93aff5]" strokeWidth={1.5} />
              </div>
              <p className="text-white/70 text-base sm:text-xl md:text-2xl font-medium">
                Octobre Rose &amp; Novembre Bleu — HEST Lomé
              </p>
            </div>

            {/* Compteur principal */}
            <motion.div
              className="text-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <p className="text-white/60 text-sm sm:text-lg uppercase tracking-widest font-semibold mb-2 flex items-center justify-center gap-2">
                <Users size={18} className="text-white/40" />
                Participants inscrits
              </p>
              <p
                className="font-black text-white"
                style={{ fontSize: "clamp(5rem, 15vw, 12rem)", lineHeight: 1 }}
              >
                {data.count}
              </p>
              <p className="text-white/50 text-base sm:text-lg">
                sur {data.maxNumber} numéros
              </p>
            </motion.div>

            {/* Dernière inscription */}
            {data.latest && (
              <motion.div
                key={data.latest.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-sm rounded-3xl px-6 sm:px-8 py-4 sm:py-5 text-center border border-white/20 w-full max-w-sm sm:max-w-md"
              >
                <p className="text-white/60 text-xs sm:text-sm uppercase tracking-widest font-semibold mb-1">
                  Dernière inscription
                </p>
                <p className="text-white font-black text-2xl sm:text-3xl md:text-4xl">
                  {data.latest.firstName} {data.latest.lastName}
                </p>
                <p
                  className="text-lg sm:text-2xl font-bold mt-1 flex items-center justify-center gap-2"
                  style={{ color: data.latest.gender === "Fille" ? "#F06AAD" : "#93aff5" }}
                >
                  <Ribbon size={18} strokeWidth={1.5} />
                  Numéro {data.latest.number} — Équipe {TEAM_NAMES[data.latest.team - 1] || data.latest.team}
                </p>
              </motion.div>
            )}

            {/* Statut */}
            <div
              className={`text-sm sm:text-base font-bold px-5 sm:px-6 py-2.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-2 ${
                data.drawOpen
                  ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                  : "bg-red-500/30 text-red-200 border-red-400/40"
              }`}
            >
              {data.drawOpen ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                  Tirage ouvert — Inscrivez-vous sur votre téléphone !
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  Tirage fermé — Ouverture prévue à {data.openTime || "13h30"}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── COMPTE À REBOURS ── */}
        {screenState === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 gap-6"
          >
            <p className="text-white/70 text-xl sm:text-2xl font-semibold uppercase tracking-widest text-center px-4">
              Tirage du gagnant dans…
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="font-black text-white"
                style={{ fontSize: "clamp(8rem, 25vw, 20rem)", lineHeight: 1 }}
              >
                {countdown}
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-2">
              {[5, 4, 3, 2, 1].map((n) => (
                <div
                  key={n}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    n > countdown ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── ROUE EN TRAIN DE TOURNER ── */}
        {screenState === "spinning" && (
          <motion.div
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 gap-6 sm:gap-8"
          >
            <p className="text-white font-black text-2xl sm:text-3xl animate-pulse flex items-center gap-3">
              <Trophy size={28} className="text-yellow-300" />
              La roue tourne…
            </p>
            <SpinningWheel
              finalRotation={spinRotation}
              isSpinning={true}
              size={320}
            />
          </motion.div>
        )}

        {/* ── RÉVÉLATION DU GAGNANT ── */}
        {screenState === "revealed" && displayedWinner && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 15 }}
            className="flex flex-col items-center justify-center flex-1 px-6 sm:px-8 py-12 gap-5 sm:gap-6"
          >
            {/* Titre */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-white/70 text-xl sm:text-2xl font-semibold uppercase tracking-widest text-center"
            >
              <Trophy size={28} className="text-yellow-300" />
              Et le gagnant est…
            </motion.div>

            {/* Numéro */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.5 }}
              className="rounded-[2rem] py-6 sm:py-8 px-10 sm:px-16 text-center"
              style={{
                background:
                  displayedWinner.gender === "Fille"
                    ? "linear-gradient(135deg, #D81B7A, #F06AAD)"
                    : "linear-gradient(135deg, #1A3FA8, #3b5fc0)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.3)",
              }}
            >
              <p className="text-white/80 text-sm sm:text-lg uppercase tracking-widest font-semibold mb-2">
                Numéro gagnant
              </p>
              <p
                className="text-white font-black"
                style={{ fontSize: "clamp(5rem, 20vw, 16rem)", lineHeight: 1 }}
              >
                {displayedWinner.number}
              </p>
            </motion.div>

            {/* Nom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <p
                className="text-white font-black"
                style={{ fontSize: "clamp(2rem, 7vw, 5rem)" }}
              >
                {displayedWinner.firstName}
              </p>
              <p
                className="text-white font-black"
                style={{ fontSize: "clamp(2rem, 7vw, 5rem)" }}
              >
                {displayedWinner.lastName}
              </p>
              {displayedWinner.filiere && (
                <p className="text-white/60 text-lg sm:text-2xl mt-2">
                  {displayedWinner.filiere}
                </p>
              )}
            </motion.div>

            {/* Félicitations */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex items-center gap-3 text-white/80 text-xl sm:text-2xl font-bold text-center"
            >
              <Star size={24} className="text-yellow-300" />
              Félicitations !
              <Star size={24} className="text-yellow-300" />
            </motion.div>

            {/* Bouton retour */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={() => {
                setScreenState("idle");
                setDisplayedWinner(null);
                setShowConfetti(false);
              }}
              className="text-white/40 hover:text-white/70 text-sm border border-white/20 px-4 py-2 rounded-full transition-colors flex items-center gap-2"
            >
              <Minimize2 size={14} />
              Retour à l&apos;écran principal
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
