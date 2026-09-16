import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_DECISIONS,
  DATA_TABLES,
  OBJECTION_SHORTCUTS,
  PAUSE_STATUS,
  WORKFLOW_GROUPS,
} from "../shared/dataArchitecture";

describe("dashboard data architecture", () => {
  it("defines exactly ten tables with unique names, grains and primary keys", () => {
    expect(DATA_TABLES).toHaveLength(10);
    expect(new Set(DATA_TABLES.map((table) => table.name)).size).toBe(10);

    for (const table of DATA_TABLES) {
      expect(table.grain.length).toBeGreaterThan(10);
      expect(table.primaryKey.length).toBeGreaterThan(0);
      expect(table.fields.some((field) => field.name === table.primaryKey)).toBe(true);
    }
  });

  it("keeps Aoikumo authoritative for appointment and payment operations", () => {
    expect(DATA_TABLES.find((table) => table.name === "Raw_Appointment")?.authority).toBe("Aoikumo");
    expect(DATA_TABLES.find((table) => table.name === "Raw_Payment")?.authority).toBe("Aoikumo");
  });

  it("organizes work into three main workflows with one shared pause state", () => {
    expect(WORKFLOW_GROUPS.map((group) => group.id)).toEqual([
      "blast-ownership",
      "appointment-attendance",
      "payment-signup",
    ]);
    expect(PAUSE_STATUS.code).toBe("PAUSED_PENDING_VERIFICATION");
  });

  it("keeps the four material attribution decisions pending until approved", () => {
    expect(ATTRIBUTION_DECISIONS.map((decision) => decision.id)).toEqual([
      "owner-transfer",
      "appointment-cancelled",
      "appointment-rescheduled",
      "payment-business-date",
    ]);
    expect(ATTRIBUTION_DECISIONS.every((decision) => decision.status === "PENDING VERIFICATION")).toBe(true);
  });

  it("organizes objections as exactly three shortcut workflows", () => {
    expect(OBJECTION_SHORTCUTS).toHaveLength(3);
    expect(new Set(OBJECTION_SHORTCUTS.map((shortcut) => shortcut.id)).size).toBe(3);
    expect(OBJECTION_SHORTCUTS.every((shortcut) => shortcut.kind === "SHORTCUT WORKFLOW")).toBe(true);
  });
});
