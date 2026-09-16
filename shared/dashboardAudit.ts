export type DashboardQualityGateInput = {
  checkedAt: string;
  sourceTab?: string;
  sourceRange?: string;
  qualityGates: {
    scHeader: string;
    monthSequence: string;
    scNumericComposition: string;
    mrlGate: string;
    stockComposition: string;
    stockMeaning: string;
  };
};

type AuditResult = {
  evidenceStatus: "CURRENTLY VERIFIED" | "HISTORICALLY VERIFIED";
  operationallyUsable: boolean;
  blockedBy: string[];
};

const isPass = (value: string) => value.trim().toUpperCase() === "PASS";

export function resolveDashboardAudit(
  snapshot: { currentAudit?: DashboardQualityGateInput } | null | undefined,
  currentEmbeddedAudit: DashboardQualityGateInput,
) {
  return snapshot?.currentAudit ?? currentEmbeddedAudit;
}

export function evaluateDashboardAudit(audit: DashboardQualityGateInput): {
  mrl: AuditResult;
  stock: AuditResult;
} {
  const mrlChecks = [
    ["SC header", audit.qualityGates.scHeader],
    ["Month sequence", audit.qualityGates.monthSequence],
    ["SC numeric / composition", audit.qualityGates.scNumericComposition],
    ["MRL gate", audit.qualityGates.mrlGate],
  ] as const;
  const stockChecks = [
    ["Stock composition", audit.qualityGates.stockComposition, isPass(audit.qualityGates.stockComposition)],
    [
      "Physical stock evidence",
      audit.qualityGates.stockMeaning,
      audit.qualityGates.stockMeaning.trim().toUpperCase() === "PHYSICAL VERIFIED",
    ],
  ] as const;

  const mrlBlockedBy = mrlChecks.filter(([, value]) => !isPass(value)).map(([label]) => label);
  const stockBlockedBy = stockChecks.filter(([, , passed]) => !passed).map(([label]) => label);

  return {
    mrl: {
      evidenceStatus: mrlBlockedBy.length ? "HISTORICALLY VERIFIED" : "CURRENTLY VERIFIED",
      operationallyUsable: mrlBlockedBy.length === 0,
      blockedBy: mrlBlockedBy,
    },
    stock: {
      evidenceStatus: stockBlockedBy.length ? "HISTORICALLY VERIFIED" : "CURRENTLY VERIFIED",
      operationallyUsable: stockBlockedBy.length === 0,
      blockedBy: stockBlockedBy,
    },
  };
}
