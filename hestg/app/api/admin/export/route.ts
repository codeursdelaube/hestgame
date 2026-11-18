/**
 * app/api/admin/export/route.ts
 * GET /api/admin/export — Exporte la liste des participants en CSV
 */
import { verifyAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
  if (!(await verifyAdminSession())) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const participants = await prisma.participant.findMany({
    orderBy: { number: "asc" },
  });

  // Construction du CSV
  const header = "Numéro,Prénom,Nom,Genre,Filière,Équipe,Date inscription";
  const rows = participants.map((p) => {
    const date = new Date(p.createdAt).toLocaleString("fr-FR", {
      timeZone: "Africa/Lome",
    });
    return [
      p.number,
      `"${p.firstName}"`,
      `"${p.lastName}"`,
      p.gender,
      `"${p.filiere || ""}"`,
      p.team,
      `"${date}"`,
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `hestgame-participants-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
