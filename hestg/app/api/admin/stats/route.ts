/**
 * app/api/admin/stats/route.ts
 * GET /api/admin/stats — Tableau de bord admin (participants, stats, liste)
 */
import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    // Sécurisation des colonnes de tri autorisées
    const allowedSortFields = [
      "number",
      "firstName",
      "lastName",
      "gender",
      "filiere",
      "team",
      "createdAt",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

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

    const [participants, filles, garcons, total] = await Promise.all([
      prisma.participant.findMany({
        where: search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { filiere: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { [safeSortBy]: sortDir } as never,
      }),
      prisma.participant.count({ where: { gender: "Fille" } }),
      prisma.participant.count({ where: { gender: "Garçon" } }),
      prisma.participant.count(),
    ]);

    const maxNumber = settings?.maxNumber ?? 200;

    return Response.json({
      total,
      filles,
      garcons,
      maxNumber,
      teamCount: settings?.teamCount ?? 4,
      drawOpen: settings?.drawOpen ?? false,
      openTime: settings?.openTime || "13:30",
      closedMessage:
        settings?.closedMessage ||
        "Le tirage n'est pas encore ouvert. Veuillez patienter.",
      autoOpen: settings?.autoOpen ?? false,
      remaining: Math.max(0, maxNumber - total),
      participants,
    });
  } catch (err: unknown) {
    console.error("Erreur /api/admin/stats:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Erreur de connexion à la base de données";
    return Response.json(
      {
        error:
          "Impossible de charger les statistiques. Vérifiez la connexion à la base de données.",
        details: msg,
      },
      { status: 500 }
    );
  }
}
