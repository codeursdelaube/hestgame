/**
 * app/admin/layout.tsx
 * Layout de l'espace admin avec navigation
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin – HESTGame",
  description: "Espace administrateur HESTGame",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh flex flex-col">{children}</div>;
}
