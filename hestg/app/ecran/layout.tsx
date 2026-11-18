/**
 * app/ecran/layout.tsx
 * Layout spécial pour l'écran de projection (pas de header/footer global)
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Écran de projection – HESTGame",
};

export default function EcranLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
