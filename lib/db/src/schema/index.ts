import { pgTable, text, jsonb, timestamp, serial, varchar, boolean, index } from "drizzle-orm/pg-core";

export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppState = typeof appState.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  organization: varchar("organization", { length: 100 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userOrg: varchar("user_org", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  entityLabel: text("entity_label"),
  action: varchar("action", { length: 20 }).notNull(),
  field: varchar("field", { length: 100 }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  summary: text("summary"),
}, (t) => ({
  createdAtIdx: index("audit_log_created_at_idx").on(t.createdAt),
  entityIdx: index("audit_log_entity_idx").on(t.entityType, t.entityId),
}));

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
