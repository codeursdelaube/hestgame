/**
 * app/admin/login/page.tsx
 * Page de connexion admin — saisie du code PIN
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Code PIN incorrect");
      }
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #fff0f7 0%, #f0f4ff 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-hest p-8 w-full max-w-sm"
      >
        {/* Ruban */}
        <div className="ribbon" />

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mt-2 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #D81B7A, #1A3FA8)" }}
          >
            <Lock size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black gradient-title">HESTGame</h1>
            <p className="text-sm text-gray-500 font-medium">Espace Administrateur</p>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Code PIN
            </label>
            <div className="relative">
              <input
                id="pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Entrez le code PIN"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-base
                  outline-none focus:border-[#D81B7A] focus:ring-2 focus:ring-[#D81B7A]/20 transition-colors"
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                tabIndex={-1}
                aria-label={showPin ? "Masquer le PIN" : "Afficher le PIN"}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="btn-hest-pink w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Vérification…
              </>
            ) : (
              <>
                <Lock size={16} />
                Se connecter
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
