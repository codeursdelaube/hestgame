/**
 * app/page.tsx
 * Page principale — Participant (mobile-first)
 * Formulaire + roue + attribution du numéro
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ChevronRight,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  Trophy,
  Ribbon,
  GraduationCap,
} from "lucide-react";
import HESTHeader from "@/components/HESTHeader";
import SpinningWheel from "@/components/SpinningWheel";
import NumberCard from "@/components/NumberCard";
import ConfettiEffect from "@/components/ConfettiEffect";

// Clé localStorage pour mémoriser les données du participant
const STORAGE_KEY = "hestgame_participant";

interface ParticipantData {
  number: number;
  team: number;
  firstName: string;
  lastName: string;
  gender: "Fille" | "Garçon";
  token: string;
}

type AppState =
  | "loading"    // Chargement initial
  | "closed"     // Tirage fermé → compte à rebours
  | "full"       // Tous les numéros attribués
  | "form"       // Formulaire d'inscription
  | "spinning"   // Roue en cours
  | "result";    // Résultat affiché

/** Calcule les secondes restantes avant l'heure d'ouverture (HH:MM Togo UTC+0) */
function secondsUntilOpen(openTime: string): number {
  const now = new Date();
  // Heure actuelle en Togo (UTC+0 = même que UTC)
  const togoNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lome" }));
  const [hh, mm] = openTime.split(":").map(Number);
  const target = new Date(togoNow);
  target.setHours(hh, mm, 0, 0);
  const diff = Math.floor((target.getTime() - togoNow.getTime()) / 1000);
  return diff > 0 ? diff : 0;
}

/** Formate les secondes en HH:MM:SS */
function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ParticipantPage() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [statusInfo, setStatusInfo] = useState({
    openTime: "13:30",
    closedMessage: "Le tirage n'est pas encore ouvert. Veuillez patienter.",
  });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "" as "Fille" | "Garçon" | "",
    filiere: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // ── Compte à rebours ──
  const [countdown, setCountdown] = useState(0);

  // Tick du compte à rebours (1s) — simple, pas de dépendance sur openTime
  useEffect(() => {
    if (appState !== "closed" || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [appState, countdown]);

  /** Vérifie si un résultat est déjà sauvegardé localement */
  const checkLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: ParticipantData = JSON.parse(saved);
        return data;
      }
    } catch {}
    return null;
  }, []);

  /** Vérifie l'état du tirage et restaure la session */
  const checkStatus = useCallback(async () => {
    // 1. Vérifier localStorage d'abord
    const saved = checkLocalStorage();
    if (saved) {
      setParticipant(saved);
      setAppState("result");
      return;
    }

    // 2. Vérifier l'état du tirage via l'API
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();

      const ot = data.openTime || "13:30";
      setStatusInfo({
        openTime: ot,
        closedMessage: data.closedMessage || "Le tirage n'est pas encore ouvert. Veuillez patienter.",
      });

      if (!data.drawOpen) {
        // Calculer le countdown ICI, en même temps qu'on connaît l'heure
        setCountdown(secondsUntilOpen(ot));
        setAppState("closed");
      } else if (data.full) {
        setAppState("full");
      } else {
        setAppState("form");
      }
    } catch {
      setAppState("form"); // Fallback
    }
  }, [checkLocalStorage]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Polling universel : détecte les changements d'état dans TOUS les états actifs
  // (closed → s'ouvre, form → se ferme, full → se vide si reset)
  useEffect(() => {
    // Pas de polling si on a un résultat définitif ou si on est en animation
    if (appState === "result" || appState === "spinning" || appState === "loading") return;
    const interval = setInterval(() => {
      checkStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [appState, checkStatus]);

  /** Validation du formulaire */
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2) {
      newErrors.firstName = "Le prénom doit avoir au moins 2 caractères";
    }
    if (!form.lastName.trim() || form.lastName.trim().length < 2) {
      newErrors.lastName = "Le nom doit avoir au moins 2 caractères";
    }
    if (!form.gender) {
      newErrors.gender = "Veuillez sélectionner votre genre";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Soumet le formulaire et déclenche le tirage */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGlobalError("");

    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || "Une erreur est survenue");
        setIsSubmitting(false);
        return;
      }

      const extraTurns = 3 * 360;
      const landingAngle = Math.random() * 360;
      setFinalRotation(extraTurns + landingAngle);

      setParticipant(data);
      setAppState("spinning");
    } catch {
      setGlobalError("Impossible de contacter le serveur. Réessayez.");
      setIsSubmitting(false);
    }
  };

  /** Appelé à la fin de l'animation de la roue */
  const handleSpinComplete = () => {
    if (!participant) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participant));
    setShowConfetti(true);
    setAppState("result");
  };

  return (
    <div className="flex flex-col min-h-dvh">
      <HESTHeader />
      <ConfettiEffect trigger={showConfetti} mode="normal" />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <AnimatePresence mode="wait">

          {/* ── CHARGEMENT ── */}
          {appState === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 size={48} className="text-[#D81B7A] animate-spin" />
              <p className="text-gray-500 font-medium">Chargement…</p>
            </motion.div>
          )}

          {/* ── TIRAGE FERMÉ avec compte à rebours ── */}
          {appState === "closed" && (
            <motion.div
              key="closed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card-hest p-6 sm:p-8 max-w-sm w-full text-center"
            >
              <div className="ribbon" />

              {/* Icône horloge */}
              <div className="flex justify-center mt-3 mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-pink-100 to-blue-100">
                  <Clock size={32} className="text-[#D81B7A]" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Tirage pas encore ouvert
              </h2>

              {/* Heure prévue */}
              <div className="bg-pink-50 border border-pink-100 rounded-xl py-3 px-4 mb-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-[#D81B7A] mb-1">
                  Heure prévue
                </p>
                <p className="text-3xl font-black text-gray-800">
                  {statusInfo.openTime}
                </p>
              </div>

              {/* Compte à rebours */}
              {countdown > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                    Ouverture dans
                  </p>
                  <motion.p
                    key={countdown}
                    initial={{ scale: 1.15, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-black tabular-nums"
                    style={{ color: countdown < 60 ? "#D81B7A" : "#1A3FA8" }}
                  >
                    {formatCountdown(countdown)}
                  </motion.p>
                </div>
              )}

              {countdown === 0 && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">
                    L&apos;heure est passée — en attente d&apos;ouverture admin
                  </p>
                </div>
              )}

              <p className="text-gray-500 text-sm mb-4">
                {statusInfo.closedMessage}
              </p>

              {/* Indicateur de polling */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                <span>En attente de l&apos;administrateur…</span>
              </div>
              <button
                type="button"
                onClick={() => checkStatus()}
                className="mt-4 text-xs font-semibold text-[#D81B7A] hover:underline"
              >
                Actualiser manuellement
              </button>
            </motion.div>
          )}

          {/* ── COMPLET ── */}
          {appState === "full" && (
            <motion.div
              key="full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card-hest p-8 max-w-sm w-full text-center"
            >
              <div className="ribbon" />
              <div className="flex justify-center mt-3 mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100">
                  <Trophy size={32} className="text-yellow-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Tous les numéros sont attribués
              </h2>
              <p className="text-gray-500 text-sm">
                La liste des participants est complète. Bonne chance à tous !
              </p>
            </motion.div>
          )}

          {/* ── FORMULAIRE ── */}
          {appState === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="card-hest p-5 sm:p-6 max-w-sm w-full"
            >
              <div className="ribbon" />
              <div className="mt-3 mb-5 flex items-center gap-2">
                <User size={20} className="text-[#D81B7A]" />
                <h2 className="text-lg font-bold text-gray-800">
                  Inscris-toi pour participer
                </h2>
              </div>

              {globalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{globalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Prénom */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Prénom <span className="text-[#D81B7A]">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    placeholder="Votre prénom"
                    autoComplete="given-name"
                    className={`w-full px-4 py-3 rounded-xl border text-base transition-colors outline-none
                      focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20
                      ${errors.firstName ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>

                {/* Nom */}
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Nom <span className="text-[#D81B7A]">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    placeholder="Votre nom de famille"
                    autoComplete="family-name"
                    className={`w-full px-4 py-3 rounded-xl border text-base transition-colors outline-none
                      focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20
                      ${errors.lastName ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>

                {/* Genre */}
                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-2">
                    Genre <span className="text-[#D81B7A]">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Fille", "Garçon"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, gender: g }))}
                        className={`py-3 rounded-xl font-semibold text-sm transition-all border-2 flex items-center justify-center gap-2
                          ${
                            form.gender === g
                              ? g === "Fille"
                                ? "bg-[#D81B7A] text-white border-[#D81B7A]"
                                : "bg-[#1A3FA8] text-white border-[#1A3FA8]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <Ribbon
                          size={16}
                          className={form.gender === g ? "text-white" : g === "Fille" ? "text-[#D81B7A]" : "text-[#1A3FA8]"}
                        />
                        {g}
                      </button>
                    ))}
                  </div>
                  {errors.gender && (
                    <p className="mt-1 text-xs text-red-500">{errors.gender}</p>
                  )}
                </div>

                {/* Filière (optionnel) */}
                <div>
                  <label
                    htmlFor="filiere"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Filière / Classe{" "}
                    <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <GraduationCap
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="filiere"
                      type="text"
                      value={form.filiere}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, filiere: e.target.value }))
                      }
                      placeholder="Ex : Informatique, Licence 2…"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-base
                        transition-colors outline-none focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20"
                    />
                  </div>
                </div>

                {/* Bouton Tourner */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-hest-pink w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Préparation…
                    </>
                  ) : (
                    <>
                      Tourner la roue
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── ROUE EN TRAIN DE TOURNER ── */}
          {appState === "spinning" && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-[#D81B7A] font-bold text-xl animate-pulse">
                La roue tourne…
              </p>
              <SpinningWheel
                finalRotation={finalRotation}
                isSpinning={true}
                onComplete={handleSpinComplete}
                size={300}
              />
              <p className="text-gray-500 text-sm font-medium">
                Votre numéro arrive !
              </p>
            </motion.div>
          )}

          {/* ── RÉSULTAT ── */}
          {appState === "result" && participant && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 w-full max-w-sm"
            >
              <NumberCard
                number={participant.number}
                team={participant.team}
                firstName={participant.firstName}
                lastName={participant.lastName}
                gender={participant.gender as "Fille" | "Garçon"}
              />
              <p className="text-xs text-gray-400 text-center px-4">
                Mémorise ton numéro ! Il te sera demandé lors du tirage final à 17h.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Pied de page */}
      <footer className="py-4 text-center text-xs text-gray-400">
        HESTGame © 2026 – HEST Lomé
      </footer>
    </div>
  );
}
