/**
 * app/api/admin/login/route.ts
 * POST /api/admin/login — Connexion admin par PIN
 */
import { NextRequest } from "next/server";
import { adminLoginSchema } from "@/lib/schemas";
import { createAdminSession } from "@/lib/auth";


export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "PIN requis" }, { status: 400 });
  }

  const { pin } = parsed.data;
  const adminPin = process.env.ADMIN_PIN;

  if (!adminPin || pin !== adminPin) {
    // Délai intentionnel pour ralentir les attaques par force brute
    await new Promise((r) => setTimeout(r, 500));
    return Response.json({ error: "Code PIN incorrect" }, { status: 401 });
  }

  await createAdminSession();
  return Response.json({ success: true });
}
