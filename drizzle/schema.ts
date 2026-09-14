import {
  bigint,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const dashboardSnapshots = mysqlTable("dashboard_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotKey: varchar("snapshotKey", { length: 128 }).notNull().unique(),
  version: varchar("version", { length: 32 }).notNull(),
  sourceReadAtMs: bigint("sourceReadAtMs", { mode: "number" }).notNull(),
  resultsAsOf: varchar("resultsAsOf", { length: 10 }).notNull(),
  stockAsOf: varchar("stockAsOf", { length: 10 }).notNull(),
  snapshotJson: longtext("snapshotJson").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidenceFiles = mysqlTable("evidence_files", {
  id: int("id").autoincrement().primaryKey(),
  storageKey: varchar("storageKey", { length: 700 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 800 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
  business: varchar("business", { length: 32 }).notNull(),
  area: varchar("area", { length: 80 }).notNull(),
  evidenceLabel: varchar("evidenceLabel", { length: 180 }).notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  uploadedByOpenId: varchar("uploadedByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DashboardSnapshot = typeof dashboardSnapshots.$inferSelect;
export type InsertDashboardSnapshot = typeof dashboardSnapshots.$inferInsert;
export type EvidenceFile = typeof evidenceFiles.$inferSelect;
export type InsertEvidenceFile = typeof evidenceFiles.$inferInsert;
