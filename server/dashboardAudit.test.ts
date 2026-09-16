import { describe, expect, it } from "vitest";
import { evaluateDashboardAudit, resolveDashboardAudit } from "../shared/dashboardAudit";

const blockedAudit = {
  checkedAt: "2026-09-16T22:42:08+08:00",
  qualityGates: {
    scHeader: "BLOCK",
    monthSequence: "BLOCK",
    scNumericComposition: "BLOCK",
    mrlGate: "BLOCK",
    stockComposition: "BLOCK",
    stockMeaning: "BOOK ONLY; physical count and shipment completeness unverified",
  },
};

describe("evaluateDashboardAudit", () => {
  it("uses the current embedded audit when a persisted historical snapshot has no audit overlay", () => {
    expect(resolveDashboardAudit({ meta: { generatedAt: "2026-09-14" } }, blockedAudit)).toBe(blockedAudit);
  });

  it("keeps blocked MRL values historical instead of current", () => {
    const result = evaluateDashboardAudit(blockedAudit);

    expect(result.mrl).toEqual({
      evidenceStatus: "HISTORICALLY VERIFIED",
      operationallyUsable: false,
      blockedBy: ["SC header", "Month sequence", "SC numeric / composition", "MRL gate"],
    });
  });

  it("keeps book stock historical when composition or physical evidence is blocked", () => {
    const result = evaluateDashboardAudit(blockedAudit);

    expect(result.stock).toEqual({
      evidenceStatus: "HISTORICALLY VERIFIED",
      operationallyUsable: false,
      blockedBy: ["Stock composition", "Physical stock evidence"],
    });
  });

  it("marks metrics current only after every required gate passes", () => {
    const result = evaluateDashboardAudit({
      checkedAt: "2026-09-16T22:42:08+08:00",
      qualityGates: {
        scHeader: "PASS",
        monthSequence: "PASS",
        scNumericComposition: "PASS",
        mrlGate: "PASS",
        stockComposition: "PASS",
        stockMeaning: "PHYSICAL VERIFIED",
      },
    });

    expect(result.mrl.operationallyUsable).toBe(true);
    expect(result.mrl.evidenceStatus).toBe("CURRENTLY VERIFIED");
    expect(result.stock.operationallyUsable).toBe(true);
    expect(result.stock.evidenceStatus).toBe("CURRENTLY VERIFIED");
  });
});
