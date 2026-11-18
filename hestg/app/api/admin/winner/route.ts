/**
 * app/api/admin/winner/route.ts
 * GET  — Récupère le gagnant actuel (ou null)
 * POST — Lance le tirage du gagnant (admin seulement)
 */
import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

/** Récupère le gagnant actuel */
export async function GET() {
  try {
    if (!(await verifyAdminSession())) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const winner = await prisma.winner.findFirst({
      where: { archived: false },
      include: { participant: true },
      orderBy: { drawnAt: "desc" },
    });

    if (!winner) return Response.json({ winner: null });

    return Response.json({
      winner: {
        id: winner.id,
        number: winner.number,
        drawnAt: winner.drawnAt,
        firstName: winner.participant.firstName,
        lastName: winner.participant.lastName,
        gender: winner.participant.gender,
        filiere: winner.participant.filiere,
        team: winner.participant.team,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur GET /api/admin/winner:", err);
    return Response.json({ winner: null, error: "Base de données non accessible" }, { status: 500 });
  }
}

/** Lance le tirage du gagnant */
export async function POST(req: NextRequest) {
  try {
    if (!(await verifyAdminSession())) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body: { relaunch?: boolean } = {};
    try {
      body = await req.json();
    } catch {}

    // Si un gagnant existe et qu'on ne relance pas → erreur
    const existing = await prisma.winner.findFirst({ where: { archived: false } });
    if (existing && !body.relaunch) {
      return Response.json(
        {
          error:
            "Un gagnant existe déjà. Utilisez relaunch:true pour relancer et archiver l'ancien.",
        },
        { status: 409 }
      );
    }

    // Si relance : archiver l'ancien gagnant
    if (existing && body.relaunch) {
      await prisma.winner.update({
        where: { id: existing.id },
        data: { archived: true },
      });
    }

    // Cherche tous les numéros attribués
    const participants = await prisma.participant.findMany({
      select: { id: true, number: true },
    });

    if (participants.length === 0) {
      return Response.json(
        { error: "Aucun participant inscrit." },
        { status: 400 }
      );
    }

    // Tirage aléatoire sécurisé côté serveur
    const pickedIndex = randomInt(0, participants.length);
    const picked = participants[pickedIndex];

    const winner = await prisma.winner.create({
      data: {
        participantId: picked.id,
        number: picked.number,
      },
      include: { participant: true },
    });

    return Response.json({
      winner: {
        id: winner.id,
        number: winner.number,
        drawnAt: winner.drawnAt,
        firstName: winner.participant.firstName,
        lastName: winner.participant.lastName,
        gender: winner.participant.gender,
        filiere: winner.participant.filiere,
        team: winner.participant.team,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur POST /api/admin/winner:", err);
    return Response.json(
      { error: "Erreur lors du tirage du gagnant." },
      { status: 500 }
    );
  }
}
