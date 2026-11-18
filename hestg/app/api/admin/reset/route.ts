/**
 * app/api/admin/reset/route.ts
 * POST /api/admin/reset — Réinitialise toutes les données (participants + gagnants)
 * Requiert la confirmation "RESET"
 */
import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resetSchema } from "@/lib/schemas";


export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession())) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Tapez exactement "RESET" pour confirmer' },
      { status: 400 }
    );
  }

  // Suppression dans le bon ordre (FK : winners avant participants)
  await prisma.$transaction([
    prisma.winner.deleteMany(),
    prisma.participant.deleteMany(),
  ]);

  return Response.json({ success: true, message: "Données réinitialisées." });
}
