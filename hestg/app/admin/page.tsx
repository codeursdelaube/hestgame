/**
 * app/admin/page.tsx
 * Tableau de bord administrateur
 * - Stats générales
 * - Liste des participants avec recherche/tri/export
 * - Paramètres
 * - Équipes
 * - Réinitialisation
 * - Lancer le tirage gagnant
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Settings,
  Trophy,
  Download,
  RefreshCw,
  LogOut,
  Power,
  PowerOff,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Check,
  Shuffle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SpinningWheel from "@/components/SpinningWheel";
import ConfettiEffect from "@/components/ConfettiEffect";

// ─── Types ───────────────────────────────────────────
interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  filiere?: string;
  number: number;
  team: number;
  createdAt: string;
}

interface Stats {
  total: number;
  filles: number;
  garcons: number;
  maxNumber: number;
  teamCount: number;
  drawOpen: boolean;
  openTime: string;
  closedMessage: string;
  autoOpen: boolean;
  remaining: number;
  participants: Participant[];
}

interface Winner {
  number: number;
  firstName: string;
  lastName: string;
  gender: string;
  filiere?: string;
  team: number;
  drawnAt: string;
}

type AdminTab = "dashboard" | "settings" | "teams" | "winner";

const TEAM_NAMES = ["Alpha", "Bêta", "Gamma", "Delta", "Epsilon", "Zêta", "Êta", "Thêta"];

// ─── Composant principal ──────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Paramètres
  const [settingsForm, setSettingsForm] = useState({
    maxNumber: 200,
    teamCount: 4,
    drawOpen: false,
    openTime: "13:30",
    closedMessage: "Le tirage n'est pas encore ouvert. Veuillez patienter.",
    autoOpen: false,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // Réinitialisation
  const [resetStep, setResetStep] = useState<"idle" | "confirm1" | "confirm2">("idle");
  const [resetInput, setResetInput] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  // Tirage gagnant
  const [winnerSpinning, setWinnerSpinning] = useState(false);
  const [winnerRotation, setWinnerRotation] = useState(0);
  const [showWinnerConfetti, setShowWinnerConfetti] = useState(false);
  const [winnerRelaunchConfirm, setWinnerRelaunchConfirm] = useState(false);
  const [winnerError, setWinnerError] = useState("");
  const [pendingWinner, setPendingWinner] = useState<Winner | null>(null);

  // ── Chargement des données ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setDbError("");
    try {
      const [statsRes, winnerRes] = await Promise.all([
        fetch(`/api/admin/stats?search=${encodeURIComponent(search)}&sortBy=${sortBy}&sortDir=${sortDir}`),
        fetch("/api/admin/winner"),
      ]);

      if (statsRes.status === 401 || winnerRes.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!statsRes.ok) {
        let errMessage = "Erreur de connexion à la base de données";
        try {
          const errData = await statsRes.json();
          if (errData?.details) {
            errMessage = `${errData.error} : ${errData.details}`;
          } else if (errData?.error) {
            errMessage = errData.error;
          }
        } catch {}
        setDbError(errMessage);
        return;
      }

      const statsData = await statsRes.json();
      let winnerData = { winner: null };
      if (winnerRes.ok) {
        try {
          winnerData = await winnerRes.json();
        } catch {}
      }

      setStats(statsData);
      setSettingsForm({
        maxNumber: statsData.maxNumber,
        teamCount: statsData.teamCount,
        drawOpen: statsData.drawOpen,
        openTime: statsData.openTime || "13:30",
        closedMessage: statsData.closedMessage || "Le tirage n'est pas encore ouvert. Veuillez patienter.",
        autoOpen: statsData.autoOpen ?? false,
      });
      setWinner(winnerData.winner || null);
    } catch (err) {
      console.error("Erreur loadData:", err);
      setDbError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortDir, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Déconnexion ──
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // ── Tri des colonnes ──
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  // ── Ouvrir/Fermer le tirage directement en un clic ──
  const toggleDraw = async (openState: boolean) => {
    try {
      const updated = { ...settingsForm, drawOpen: openState };
      setSettingsForm(updated);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Erreur toggleDraw:", err);
    }
  };

  // ── Sauvegarde des paramètres ──
  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        setSettingsMsg("Paramètres sauvegardés ✓");
        await loadData();
      } else {
        const d = await res.json();
        setSettingsMsg(d.error || "Erreur lors de la sauvegarde");
      }
    } finally {
      setSettingsSaving(false);
      setTimeout(() => setSettingsMsg(""), 3000);
    }
  };

  // ── Réinitialisation ──
  const handleReset = async () => {
    if (resetInput !== "RESET") return;
    setResetLoading(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "RESET" }),
      });
      if (res.ok) {
        setResetMsg("Données réinitialisées avec succès.");
        setResetStep("idle");
        setResetInput("");
        await loadData();
      } else {
        const d = await res.json();
        setResetMsg(d.error || "Erreur");
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ── Lancer le tirage gagnant ──
  const launchWinnerDraw = async (relaunch = false) => {
    setWinnerError("");
    setWinnerRelaunchConfirm(false);

    // Animation de la roue pendant 4.5s
    setWinnerRotation(3 * 360 + Math.random() * 360);
    setWinnerSpinning(true);

    // On lance le tirage en parallèle
    try {
      const res = await fetch("/api/admin/winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relaunch }),
      });
      const data = await res.json();

      if (!res.ok) {
        setWinnerError(data.error || "Erreur lors du tirage");
        setWinnerSpinning(false);
        return;
      }

      // Stocke temporairement le gagnant, affiché après l'animation
      setPendingWinner(data.winner);
    } catch {
      setWinnerError("Impossible de contacter le serveur");
      setWinnerSpinning(false);
    }
  };

  const handleWheelComplete = () => {
    setWinnerSpinning(false);
    if (pendingWinner) {
      setWinner(pendingWinner);
      setPendingWinner(null);
      setShowWinnerConfetti(true);
    }
    loadData();
  };

  // ── Export CSV ──
  const exportCSV = () => {
    window.open("/api/admin/export", "_blank");
  };

  // ─── Rendu ───────────────────────────────────────────
  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #fff0f7 0%, #f0f4ff 100%)" }}>
      <ConfettiEffect trigger={showWinnerConfetti} mode="winner" />

      {/* ── En-tête admin ── */}
      <header className="relative bg-white shadow-sm">
        <div className="ribbon" />
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between mt-1">
          <div>
            <h1 className="text-xl font-black gradient-title">HESTGame Admin</h1>
            <p className="text-xs text-gray-400">Octobre Rose & Novembre Bleu</p>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <button
                type="button"
                onClick={() => toggleDraw(!stats.drawOpen)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-sm ${
                  stats.drawOpen
                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                    : "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
                }`}
                title={stats.drawOpen ? "Cliquer pour fermer le tirage" : "Cliquer pour ouvrir le tirage"}
              >
                {stats.drawOpen ? (
                  <>
                    <PowerOff size={13} />
                    <span>Fermer le tirage</span>
                  </>
                ) : (
                  <>
                    <Power size={13} />
                    <span>Ouvrir le tirage</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Navigation par onglets */}
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-px">
          {(
            [
              { id: "dashboard", label: "Tableau de bord", icon: Users },
              { id: "settings", label: "Paramètres", icon: Settings },
              { id: "teams", label: "Équipes", icon: Shuffle },
              { id: "winner", label: "Tirage final", icon: Trophy },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? "border-[#D81B7A] text-[#D81B7A]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {dbError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="font-bold text-red-800">Problème de connexion BDD</p>
              <p className="text-sm text-red-600">{dbError}</p>
              <button
                onClick={loadData}
                className="mt-2 text-xs font-semibold px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="text-[#D81B7A] animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ══ ONGLET TABLEAU DE BORD ══ */}
            {tab === "dashboard" && stats && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {/* ── BANDEAU DE CONTRÔLE ABSOLU DU TIRAGE ── */}
                <div className="card-hest p-5 border-2 border-indigo-100 bg-gradient-to-r from-pink-50/50 via-white to-blue-50/50">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
                          stats.drawOpen
                            ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                            : "bg-red-500 shadow-lg shadow-red-500/20"
                        }`}
                      >
                        {stats.drawOpen ? <Power size={24} /> : <PowerOff size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-gray-900 text-lg">
                            Contrôle du Tirage
                          </h2>
                          <span
                            className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                              stats.drawOpen
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {stats.drawOpen ? "Ouvert aux inscriptions" : "Fermé"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Heure prévue : <strong className="text-gray-700">{stats.openTime || "13:30"}</strong>
                          {stats.autoOpen && <span className="text-emerald-600 ml-1 font-semibold">(Ouverture auto active)</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => toggleDraw(!stats.drawOpen)}
                        className={`flex-1 md:flex-none px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                          stats.drawOpen
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        }`}
                      >
                        {stats.drawOpen ? (
                          <>
                            <PowerOff size={16} />
                            Fermer le tirage
                          </>
                        ) : (
                          <>
                            <Power size={16} />
                            Ouvrir le tirage maintenant
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTab("settings")}
                        className="px-3.5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Settings size={14} />
                        Modifier l'heure
                      </button>

                      <button
                        type="button"
                        onClick={() => setTab("winner")}
                        className="px-3.5 py-3 rounded-xl bg-[#1A3FA8] hover:bg-[#152f8a] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Trophy size={14} />
                        Roue du gagnant (après 14h)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total participants",
                      value: stats.total,
                      icon: "👥",
                      color: "#1A3FA8",
                    },
                    {
                      label: "Filles",
                      value: stats.filles,
                      icon: "🎀",
                      color: "#D81B7A",
                    },
                    {
                      label: "Garçons",
                      value: stats.garcons,
                      icon: "🎗️",
                      color: "#1A3FA8",
                    },
                    {
                      label: "Numéros restants",
                      value: stats.remaining,
                      icon: "🎟️",
                      color: stats.remaining === 0 ? "#ef4444" : "#059669",
                    },
                  ].map((s) => (
                    <div key={s.label} className="card-hest p-4">
                      <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{s.icon}</span>
                        <span
                          className="text-3xl font-black"
                          style={{ color: s.color }}
                        >
                          {s.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Barre de progression */}
                <div className="card-hest p-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Remplissage
                    </span>
                    <span className="text-sm text-gray-500">
                      {stats.total} / {stats.maxNumber}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          100,
                          (stats.total / stats.maxNumber) * 100
                        )}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #D81B7A, #1A3FA8)",
                      }}
                    />
                  </div>
                </div>

                {/* Tableau des participants */}
                <div className="card-hest overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <Users size={16} className="text-[#D81B7A]" />
                      Participants
                    </h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {/* Recherche */}
                      <div className="relative flex-1 sm:flex-none">
                        <Search
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Rechercher…"
                          className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none
                            focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20 w-full sm:w-48"
                        />
                      </div>
                      {/* Export CSV */}
                      <button
                        onClick={exportCSV}
                        className="btn-hest-blue px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        title="Exporter en CSV"
                      >
                        <Download size={14} />
                        CSV
                      </button>
                      {/* Rafraîchir */}
                      <button
                        onClick={loadData}
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                        title="Rafraîchir"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {[
                            { key: "number", label: "N°" },
                            { key: "firstName", label: "Prénom" },
                            { key: "lastName", label: "Nom" },
                            { key: "gender", label: "Genre" },
                            { key: "filiere", label: "Filière" },
                            { key: "team", label: "Équipe" },
                            { key: "createdAt", label: "Inscrit le" },
                          ].map(({ key, label }) => (
                            <th
                              key={key}
                              onClick={() => handleSort(key)}
                              className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                            >
                              <div className="flex items-center gap-1">
                                {label}
                                {sortBy === key ? (
                                  sortDir === "asc" ? (
                                    <ChevronUp size={12} />
                                  ) : (
                                    <ChevronDown size={12} />
                                  )
                                ) : null}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {stats.participants.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-center text-gray-400 text-sm"
                            >
                              {search
                                ? "Aucun résultat"
                                : "Aucun participant pour l'instant"}
                            </td>
                          </tr>
                        ) : (
                          stats.participants.map((p) => (
                            <tr
                              key={p.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <span
                                  className="font-black text-lg"
                                  style={{
                                    color:
                                      p.gender === "Fille" ? "#D81B7A" : "#1A3FA8",
                                  }}
                                >
                                  {p.number}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {p.firstName}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {p.lastName}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    p.gender === "Fille"
                                      ? "bg-pink-100 text-pink-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {p.gender === "Fille" ? "🎀" : "🎗️"} {p.gender}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {p.filiere || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-semibold text-gray-600">
                                  {TEAM_NAMES[p.team - 1] || `Équipe ${p.team}`}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                {new Date(p.createdAt).toLocaleString("fr-FR", {
                                  timeZone: "Africa/Lome",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Zone de réinitialisation */}
                <div className="card-hest p-5 border-2 border-red-100">
                  <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Zone dangereuse — Réinitialiser
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Supprime tous les participants et gagnants. Action irréversible.
                  </p>

                  {resetMsg && (
                    <p className="mb-3 text-sm text-green-600 font-medium">{resetMsg}</p>
                  )}

                  {resetStep === "idle" && (
                    <button
                      onClick={() => setResetStep("confirm1")}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      Réinitialiser les données
                    </button>
                  )}

                  {resetStep === "confirm1" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResetStep("confirm2")}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600"
                      >
                        Oui, confirmer
                      </button>
                      <button
                        onClick={() => setResetStep("idle")}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {resetStep === "confirm2" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-red-600 font-semibold">
                        Tapez <code className="bg-red-100 px-1 rounded">RESET</code> pour confirmer :
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={resetInput}
                          onChange={(e) => setResetInput(e.target.value)}
                          placeholder="RESET"
                          className="px-3 py-2 rounded-xl border border-red-300 text-sm outline-none focus:border-red-500 w-32"
                        />
                        <button
                          onClick={handleReset}
                          disabled={resetInput !== "RESET" || resetLoading}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {resetLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : null}
                          Réinitialiser
                        </button>
                        <button
                          onClick={() => {
                            setResetStep("idle");
                            setResetInput("");
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══ ONGLET PARAMÈTRES ══ */}
            {tab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card-hest p-6 max-w-md"
              >
                <div className="ribbon" />
                <h2 className="font-bold text-gray-800 text-lg mb-6 mt-2 flex items-center gap-2">
                  <Settings size={18} className="text-[#D81B7A]" />
                  Paramètres de l'événement
                </h2>

                <div className="flex flex-col gap-5">
                  {/* Heure d'ouverture du tirage (choisie par l'admin) */}
                  <div className="bg-pink-50/60 border border-pink-100 rounded-2xl p-4">
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Heure d'ouverture du tirage
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      L'heure officielle communiquée aux participants sur leur téléphone.
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="time"
                        value={settingsForm.openTime || "13:30"}
                        onChange={(e) =>
                          setSettingsForm((f) => ({ ...f, openTime: e.target.value }))
                        }
                        className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-base outline-none focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {["13:00", "13:30", "14:00", "14:30"].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setSettingsForm((f) => ({ ...f, openTime: h }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              settingsForm.openTime === h
                                ? "bg-[#D81B7A] text-white border-[#D81B7A]"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer mt-3">
                      <input
                        type="checkbox"
                        checked={settingsForm.autoOpen || false}
                        onChange={(e) =>
                          setSettingsForm((f) => ({ ...f, autoOpen: e.target.checked }))
                        }
                        className="rounded text-[#D81B7A] focus:ring-[#D81B7A] w-4 h-4"
                      />
                      <span>Ouvrir automatiquement le tirage dès que l'heure arrive</span>
                    </label>
                  </div>

                  {/* Message personnalisé quand le tirage est fermé */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Message d'attente (quand le tirage est fermé)
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.closedMessage || ""}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, closedMessage: e.target.value }))
                      }
                      placeholder="Ex: Le tirage ouvrira à 13h30. Tenez-vous prêts !"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20 resize-none"
                    />
                  </div>

                  {/* Nombre max */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Nombre maximum de participants
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={settingsForm.maxNumber}
                      onChange={(e) =>
                        setSettingsForm((f) => ({
                          ...f,
                          maxNumber: parseInt(e.target.value) || 200,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base outline-none focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20"
                    />
                  </div>

                  {/* Nombre d'équipes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Nombre d'équipes (Génies en herbe)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={settingsForm.teamCount}
                      onChange={(e) =>
                        setSettingsForm((f) => ({
                          ...f,
                          teamCount: parseInt(e.target.value) || 4,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base outline-none focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20"
                    />
                  </div>

                  {/* Ouvrir/fermer le tirage */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">
                        Tirage ouvert
                      </p>
                      <p className="text-xs text-gray-400">
                        Autorise les participants à s'inscrire
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettingsForm((f) => ({
                          ...f,
                          drawOpen: !f.drawOpen,
                        }))
                      }
                      className={`w-14 h-7 rounded-full transition-colors relative ${
                        settingsForm.drawOpen ? "bg-green-500" : "bg-gray-300"
                      }`}
                      role="switch"
                      aria-checked={settingsForm.drawOpen}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                          settingsForm.drawOpen ? "translate-x-7" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Boutons d'action rapide */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSettingsForm((f) => ({ ...f, drawOpen: true }));
                        setTimeout(() => saveSettings(), 100);
                      }}
                      className="btn-hest-pink py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Power size={16} />
                      Ouvrir le tirage
                    </button>
                    <button
                      onClick={() => {
                        setSettingsForm((f) => ({ ...f, drawOpen: false }));
                        setTimeout(() => saveSettings(), 100);
                      }}
                      className="btn-hest-blue py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <PowerOff size={16} />
                      Fermer le tirage
                    </button>
                  </div>

                  {/* Message de feedback */}
                  {settingsMsg && (
                    <p
                      className={`text-sm font-medium flex items-center gap-1 ${
                        settingsMsg.includes("✓")
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      <Check size={14} />
                      {settingsMsg}
                    </p>
                  )}

                  {/* Sauvegarder */}
                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    className="btn-hest-pink py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {settingsSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Sauvegarder les paramètres
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ ONGLET ÉQUIPES ══ */}
            {tab === "teams" && stats && (
              <motion.div
                key="teams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Shuffle size={18} className="text-[#1A3FA8]" />
                  Équipes pour Génies en herbe
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(
                    { length: stats.teamCount },
                    (_, i) => i + 1
                  ).map((teamNum) => {
                    const members = stats.participants.filter(
                      (p) => p.team === teamNum
                    );
                    return (
                      <div key={teamNum} className="card-hest overflow-hidden">
                        <div
                          className="px-4 py-3 text-white font-bold text-sm flex items-center justify-between"
                          style={{
                            background:
                              teamNum % 2 === 1
                                ? "linear-gradient(135deg, #D81B7A, #F06AAD)"
                                : "linear-gradient(135deg, #1A3FA8, #3b5fc0)",
                          }}
                        >
                          <span>
                            Équipe {TEAM_NAMES[teamNum - 1] || teamNum}
                          </span>
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {members.length} membres
                          </span>
                        </div>
                        <ul className="p-3 max-h-56 overflow-y-auto divide-y divide-gray-50">
                          {members.length === 0 ? (
                            <li className="py-3 text-center text-xs text-gray-400">
                              Aucun membre
                            </li>
                          ) : (
                            members.map((p) => (
                              <li
                                key={p.id}
                                className="py-2 flex items-center justify-between gap-2"
                              >
                                <span className="font-bold text-sm"
                                  style={{ color: p.gender === "Fille" ? "#D81B7A" : "#1A3FA8" }}>
                                  #{p.number}
                                </span>
                                <span className="text-sm text-gray-700 flex-1 truncate">
                                  {p.firstName} {p.lastName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {p.gender === "Fille" ? "🎀" : "🎗️"}
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ══ ONGLET TIRAGE FINAL ══ */}
            {tab === "winner" && (
              <motion.div
                key="winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 max-w-md mx-auto"
              >
                <div className="self-start">
                  <h2 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                    <Trophy size={22} className="text-yellow-500" />
                    Tirage du gagnant final
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Vous avez le contrôle total : lancez la roue à tout moment (après 14h) pour désigner le grand gagnant parmi tous les numéros attribués.
                  </p>
                </div>

                {winnerError && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {winnerError}
                  </div>
                )}

                {/* Roue du gagnant */}
                <div className="card-hest p-6 w-full flex flex-col items-center gap-4">
                  <div className="ribbon" />
                  <SpinningWheel
                    finalRotation={winnerRotation}
                    isSpinning={winnerSpinning}
                    onComplete={handleWheelComplete}
                    size={260}
                  />

                  {/* Gagnant affiché */}
                  <AnimatePresence>
                    {winner && !winnerSpinning && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full text-center"
                      >
                        <div
                          className="rounded-2xl py-5 px-4 mb-3"
                          style={{
                            background:
                              winner.gender === "Fille"
                                ? "linear-gradient(135deg, #D81B7A, #F06AAD)"
                                : "linear-gradient(135deg, #1A3FA8, #3b5fc0)",
                          }}
                        >
                          <p className="text-white/80 text-xs uppercase tracking-widest font-semibold mb-1">
                            🏆 Gagnant(e) du tirage
                          </p>
                          <p
                            className="text-white font-black"
                            style={{ fontSize: "4rem", lineHeight: 1 }}
                          >
                            {winner.number}
                          </p>
                          <p className="text-white font-bold text-xl mt-2">
                            {winner.firstName} {winner.lastName}
                          </p>
                          {winner.filiere && (
                            <p className="text-white/70 text-sm mt-1">
                              {winner.filiere}
                            </p>
                          )}
                          <p className="text-white/70 text-xs mt-2">
                            Tiré le{" "}
                            {new Date(winner.drawnAt).toLocaleString("fr-FR", {
                              timeZone: "Africa/Lome",
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "long",
                            })}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bouton de lancement */}
                  {!winnerSpinning && !winner && (
                    <button
                      onClick={() => launchWinnerDraw(false)}
                      className="btn-hest-pink w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Trophy size={18} />
                      Lancer la roue du gagnant
                    </button>
                  )}

                  {/* Relancer (si gagnant existe) */}
                  {!winnerSpinning && winner && (
                    <div className="w-full">
                      {!winnerRelaunchConfirm ? (
                        <button
                          onClick={() => setWinnerRelaunchConfirm(true)}
                          className="w-full py-3 rounded-xl border-2 border-orange-200 text-orange-600 font-semibold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={15} />
                          Relancer le tirage
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-orange-600 font-semibold text-center">
                            Relancer archivera le gagnant actuel. Confirmer ?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => launchWinnerDraw(true)}
                              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold"
                            >
                              Oui, relancer
                            </button>
                            <button
                              onClick={() => setWinnerRelaunchConfirm(false)}
                              className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {winnerSpinning && (
                    <p className="text-[#D81B7A] font-bold text-sm animate-pulse">
                      Tirage en cours…
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
