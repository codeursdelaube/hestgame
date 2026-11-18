/**
 * app/api/admin/logout/route.ts
 * POST /api/admin/logout — Déconnexion admin
 */
import { destroyAdminSession } from "@/lib/auth";


export async function POST() {
  await destroyAdminSession();
  return Response.json({ success: true });
}
