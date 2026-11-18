/**
 * app/api/screen/route.ts
 * GET /api/screen — Données publiques pour l'écran de projection (polling)
 */
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    const [settings, count, latest, winner] = await Promise.all([
      prisma.settings.findFirst(),
      prisma.participant.count(),
      prisma.participant.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          firstName: true,
          lastName: true,
          gender: true,
          number: true,
          team: true,
          createdAt: true,
        },
      }),
      prisma.winner.findFirst({
        where: { archived: false },
        include: {
          participant: {
            select: {
              firstName: true,
              lastName: true,
              gender: true,
              filiere: true,
            },
          },
        },
        orderBy: { drawnAt: "desc" },
      }),
    ]);

    return Response.json({
      count,
      maxNumber: settings?.maxNumber ?? 200,
      drawOpen: settings?.drawOpen ?? false,
      openTime: settings?.openTime || "13:30",
      closedMessage: settings?.closedMessage || "Le tirage n'est pas encore ouvert.",
      latest,
      winner: winner
        ? {
            number: winner.number,
            drawnAt: winner.drawnAt,
            firstName: winner.participant.firstName,
            lastName: winner.participant.lastName,
            gender: winner.participant.gender,
            filiere: winner.participant.filiere,
          }
        : null,
    });
  } catch (err) {
    console.error("Erreur /api/screen:", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
