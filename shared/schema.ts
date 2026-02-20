import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const adminStatusEnum = z.enum(["pending", "approved", "rejected"]);

export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    username: text("username").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    adminStatus: text("admin_status").notNull().default("approved"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueActiveUsername: uniqueIndex("users_username_active_uniq")
      .on(table.username)
      .where(sql`${table.isDeleted} = false`),
    uniqueActiveEmail: uniqueIndex("users_email_active_uniq")
      .on(table.email)
      .where(sql`${table.isDeleted} = false`),
  }),
);

export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  imageUrl: text("image_url"),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull().unique(),
  category: text("category").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export const registerUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  requestedRole: z.enum(["user", "admin"]).default("user"),
});
export const insertNewsSchema = createInsertSchema(news).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof news.$inferSelect;

export type UserResponse = Omit<User, 'password'>;
