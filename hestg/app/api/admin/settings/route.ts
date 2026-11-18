/**
 * app/api/admin/settings/route.ts
 * GET/PUT /api/admin/settings — Paramètres et contrôle total par l'admin
 */
import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/schemas";

export async function GET() {
  try {
    if (!(await verifyAdminSession())) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          maxNumber: 200,
          teamCount: 4,
          drawOpen: false,
          openTime: "13:30",
          closedMessage: "Le tirage n'est pas encore ouvert. Veuillez patienter.",
          autoOpen: false,
        },
      });
    }
    return Response.json(settings);
  } catch (err) {
    console.error("Erreur GET /api/admin/settings:", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Corps invalide" }, { status: 400 });
    }

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Paramètres invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        ...parsed.data,
      },
      update: parsed.data,
    });

    return Response.json(updated);
  } catch (err) {
    console.error("Erreur PUT /api/admin/settings:", err);
    return Response.json({ error: "Erreur de mise à jour" }, { status: 500 });
  }
}
