/**
 * app/api/draw/route.ts
 * POST /api/draw — Tire un numéro unique pour un participant
 *
 * Logique :
 * 1. Vérifie le rate limit (IP)
 * 2. Valide les données avec Zod
 * 3. Vérifie que le tirage est ouvert
 * 4. Vérifie l'anti-doublon (token cookie + nom normalisé)
 * 5. Choisit un numéro aléatoire côté serveur (crypto.randomInt)
 * 6. Insère en base avec retry en cas de collision (jusqu'à 5 fois)
 * 7. Pose le cookie httpOnly token
 */
import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { participantSchema, normalizeFullName } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { randomUUID } from "crypto";
import { randomInt } from "crypto";


const TOKEN_COOKIE = "hestgame_token";
const MAX_RETRIES = 10;

export async function POST(req: NextRequest) {
  // ── 1. Rate limiting par IP ──
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const { allowed } = rateLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  // ── 2. Validation des données ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = participantSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return Response.json(
      { error: "Données invalides", details: fieldErrors },
      { status: 400 }
    );
  }

  const { firstName, lastName, gender, filiere } = parsed.data;

  // ── 3. Vérifier l'état du tirage ──
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        maxNumber: 200,
        teamCount: 4,
        drawOpen: false,
        openTime: "13:30",
        closedMessage: "Le tirage n'est pas encore ouvert par l'administrateur.",
        autoOpen: false,
      },
    });
  }

  let isDrawOpen = settings.drawOpen;

  if (!isDrawOpen && settings.autoOpen && settings.openTime) {
    const togoTimeStr = new Date().toLocaleTimeString("fr-FR", {
      timeZone: "Africa/Lome",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (togoTimeStr >= settings.openTime) {
      await prisma.settings.update({ where: { id: 1 }, data: { drawOpen: true } });
      isDrawOpen = true;
    }
  }

  if (!isDrawOpen) {
    return Response.json(
      { error: settings.closedMessage || "Le tirage n'est pas encore ouvert par l'administrateur." },
      { status: 403 }
    );
  }

  // ── 4. Anti-doublon : token cookie ──
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(TOKEN_COOKIE)?.value;

  if (existingToken) {
    // Cherche le participant par token
    const existing = await prisma.participant.findUnique({
      where: { token: existingToken },
    });
    if (existing) {
      return Response.json({
        number: existing.number,
        team: existing.team,
        firstName: existing.firstName,
        lastName: existing.lastName,
        gender: existing.gender,
        token: existing.token,
      });
    }
  }

  // Anti-doublon par nom normalisé
  const normalizedKey = normalizeFullName(firstName, lastName);
  const existingByName = await prisma.participant.findFirst({
    where: {
      AND: [
        { firstName: { equals: firstName, mode: "insensitive" } },
        { lastName: { equals: lastName, mode: "insensitive" } },
      ],
    },
  });

  if (existingByName) {
    return Response.json(
      {
        error:
          "Ce nom a déjà participé au tirage. Si c'est vous, rechargez la page.",
      },
      { status: 409 }
    );
  }

  // ── 5 & 6. Choisir un numéro + insérer avec retry ──
  const totalParticipants = await prisma.participant.count();
  if (totalParticipants >= settings.maxNumber) {
    return Response.json(
      { error: "Tous les numéros sont attribués." },
      { status: 409 }
    );
  }

  const token = randomUUID();
  let participant = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Choix aléatoire parmi les numéros non attribués
    const usedNumbers = await prisma.participant.findMany({
      select: { number: true },
    });
    const usedSet = new Set(usedNumbers.map((p: { number: number }) => p.number));

    const available: number[] = [];
    for (let n = 1; n <= settings.maxNumber; n++) {
      if (!usedSet.has(n)) available.push(n);
    }

    if (available.length === 0) {
      return Response.json(
        { error: "Tous les numéros sont attribués." },
        { status: 409 }
      );
    }

    // randomInt sécurisé côté serveur
    const pickedIndex = randomInt(0, available.length);
    const pickedNumber = available[pickedIndex];
    const team = ((pickedNumber - 1) % settings.teamCount) + 1;

    try {
      participant = await prisma.participant.create({
        data: {
          firstName,
          lastName,
          gender,
          filiere: filiere || null,
          number: pickedNumber,
          team,
          token,
        },
      });
      break; // Succès
    } catch (err: unknown) {
      // Contrainte unique violée (concurrence) → réessai
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        console.warn(`Collision au tirage, tentative ${attempt + 1}/${MAX_RETRIES}`);
        // Petit délai aléatoire (10 à 60ms) pour désynchroniser les requêtes concurrentes
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 50) + 10));
        continue;
      }
      throw err;
    }
  }

  if (!participant) {
    return Response.json(
      { error: "Impossible d'attribuer un numéro. Réessayez." },
      { status: 500 }
    );
  }

  // ── 7. Pose du cookie httpOnly ──
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  });

  return Response.json({
    number: participant.number,
    team: participant.team,
    firstName: participant.firstName,
    lastName: participant.lastName,
    gender: participant.gender,
    token: participant.token,
  });
}
