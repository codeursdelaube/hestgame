/**
 * app/api/status/route.ts
 * GET /api/status — État du tirage pour les participants et l'écran
 */
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  try {
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

    let isDrawOpen = settings.drawOpen;

    // Si autoOpen est activé et qu'une heure est fixée (ex: "13:30")
    if (!isDrawOpen && settings.autoOpen && settings.openTime) {
      const now = new Date();
      // Heure locale Togo (UTC+0)
      const togoTimeStr = now.toLocaleTimeString("fr-FR", {
        timeZone: "Africa/Lome",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (togoTimeStr >= settings.openTime) {
        // Ouvre automatiquement le tirage
        await prisma.settings.update({
          where: { id: 1 },
          data: { drawOpen: true },
        });
        isDrawOpen = true;
      }
    }

    const participantCount = await prisma.participant.count();

    return Response.json({
      drawOpen: isDrawOpen,
      full: participantCount >= settings.maxNumber,
      count: participantCount,
      maxNumber: settings.maxNumber,
      openTime: settings.openTime || "13:30",
      closedMessage:
        settings.closedMessage ||
        "Le tirage n'est pas encore ouvert. Veuillez patienter.",
    });
  } catch (err) {
    console.error("Erreur /api/status:", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
