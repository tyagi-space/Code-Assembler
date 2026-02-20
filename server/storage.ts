import { db } from "./db";
import { users, news, type InsertUser, type User, type InsertNews, type News } from "@shared/schema";
import { eq, desc, ilike, or, count, and, gte, lt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPendingAdminUsers(): Promise<User[]>;
  approveAdminUser(id: string): Promise<User | undefined>;
  rejectAdminUser(id: string): Promise<User | undefined>;
  
  getNews(params?: { category?: string, search?: string, page?: number, limit?: number }): Promise<{ items: News[], total: number }>;
  getNewsById(id: string): Promise<News | undefined>;
  getNewsByUrl(sourceUrl: string): Promise<News | undefined>;
  createNews(newsData: InsertNews): Promise<News>;
  updateNewsImage(id: string, imageUrl: string): Promise<void>;
  deleteNews(id: string): Promise<void>;
  deleteNewsByCategory(category: string): Promise<number>;
  deleteNewsByDate(date: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.isDeleted, false)));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.isDeleted, false)));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPendingAdminUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.adminStatus, "pending"),
          eq(users.isAdmin, true),
          eq(users.isDeleted, false),
        ),
      )
      .orderBy(desc(users.createdAt));
  }

  async approveAdminUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isActive: true, isAdmin: true, isDeleted: false, adminStatus: "approved" })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async rejectAdminUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isActive: false, isAdmin: false, isDeleted: true, adminStatus: "rejected" })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getNews(params?: { category?: string, search?: string, page?: number, limit?: number }): Promise<{ items: News[], total: number }> {
    const { category, search, page = 1, limit = 10 } = params || {};
    const offset = (page - 1) * limit;
    
    let conditions = [];
    if (category) conditions.push(eq(news.category, category));
    if (search) conditions.push(or(ilike(news.title, `%${search}%`), ilike(news.description, `%${search}%`)));
    
    const query = db.select().from(news);
    const countQuery = db.select({ count: count() }).from(news);
    
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions);
      query.where(whereClause);
      countQuery.where(whereClause);
    }
    
    query.orderBy(desc(news.publishedAt)).limit(limit).offset(offset);
    
    const [totalRes, items] = await Promise.all([
      countQuery,
      query
    ]);
    
    return { items, total: Number(totalRes[0].count) };
  }

  async getNewsById(id: string): Promise<News | undefined> {
    const [article] = await db.select().from(news).where(eq(news.id, id));
    return article;
  }

  async getNewsByUrl(sourceUrl: string): Promise<News | undefined> {
    const [article] = await db.select().from(news).where(eq(news.sourceUrl, sourceUrl));
    return article;
  }

  async createNews(newsData: InsertNews): Promise<News> {
    const [article] = await db.insert(news).values(newsData).returning();
    return article;
  }

  async updateNewsImage(id: string, imageUrl: string): Promise<void> {
    await db
      .update(news)
      .set({ imageUrl })
      .where(eq(news.id, id));
  }

  async deleteNews(id: string): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }

  async deleteNewsByCategory(category: string): Promise<number> {
    const deleted = await db
      .delete(news)
      .where(eq(news.category, category))
      .returning({ id: news.id });
    return deleted.length;
  }

  async deleteNewsByDate(date: string): Promise<number> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const deleted = await db
      .delete(news)
      .where(and(gte(news.publishedAt, start), lt(news.publishedAt, end)))
      .returning({ id: news.id });
    return deleted.length;
  }
}

export const storage = new DatabaseStorage();
