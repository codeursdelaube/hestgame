/**
 * lib/schemas.ts
 * Schémas de validation Zod pour toutes les entrées utilisateur
 * Compatible Zod v4
 */
import { z } from "zod";

/** Schéma d'inscription d'un participant */
export const participantSchema = z.object({
  firstName: z
    .string()
    .min(2, "Le prénom doit avoir au moins 2 caractères")
    .max(50, "Prénom trop long")
    .transform((v) => v.trim()),
  lastName: z
    .string()
    .min(2, "Le nom doit avoir au moins 2 caractères")
    .max(50, "Nom trop long")
    .transform((v) => v.trim()),
  gender: z.enum(["Fille", "Garçon"], {
    error: "Genre invalide",
  }),
  filiere: z
    .string()
    .max(100, "Filière trop longue")
    .optional()
    .transform((v) => (v ? v.trim() : undefined)),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

/** Schéma de connexion admin (PIN) */
export const adminLoginSchema = z.object({
  pin: z
    .string()
    .min(1, "Le code PIN est requis")
    .max(20, "PIN trop long"),
});

/** Schéma de mise à jour des paramètres (contrôle total admin) */
export const settingsSchema = z.object({
  maxNumber: z
    .number()
    .int()
    .min(1, "Le nombre maximum doit être au moins 1")
    .max(10000, "Trop grand"),
  teamCount: z
    .number()
    .int()
    .min(2, "Il faut au moins 2 équipes")
    .max(20, "Trop d'équipes"),
  drawOpen: z.boolean(),
  openTime: z.string().optional().nullable(),
  closedMessage: z.string().max(255).optional().nullable(),
  autoOpen: z.boolean().optional(),
});

/** Schéma de confirmation de réinitialisation */
export const resetSchema = z.object({
  confirmation: z.literal("RESET"),
});

/** Normalise prénom + nom pour la déduplication */
export function normalizeFullName(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}
