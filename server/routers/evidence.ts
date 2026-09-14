import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { insertEvidenceFile, listEvidenceFiles } from "../db";
import { validateEvidenceFile } from "../evidencePolicy";
import { storagePut } from "../storage";

const uploadInput = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(160),
  base64Data: z.string().min(1).max(14_500_000),
  business: z.enum(["MUMSRELLE", "Flommie", "Both", "Internal"]),
  area: z.string().trim().min(1).max(80),
  evidenceLabel: z.string().trim().min(1).max(180),
  confirmedNoPii: z.literal(true),
});

export const evidenceRouter = router({
  list: protectedProcedure.query(() => listEvidenceFiles(25)),
  upload: protectedProcedure.input(uploadInput).mutation(async ({ ctx, input }) => {
    const { bytes, safeName, baseName } = validateEvidenceFile(input);
    const target = `mrl-flommie-evidence/${ctx.user.id}/${Date.now()}-${safeName}`;
    const stored = await storagePut(target, bytes, input.mimeType);
    const id = await insertEvidenceFile({
      storageKey: stored.key,
      storageUrl: stored.url,
      originalName: baseName,
      mimeType: input.mimeType,
      sizeBytes: bytes.length,
      business: input.business,
      area: input.area,
      evidenceLabel: input.evidenceLabel,
      uploadedByUserId: ctx.user.id,
      uploadedByOpenId: ctx.user.openId,
    });
    return { id, url: stored.url, fileName: baseName, sizeBytes: bytes.length };
  }),
});
