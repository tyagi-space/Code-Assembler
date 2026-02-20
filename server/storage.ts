import { db } from "./db";
import { users, news, type InsertUser, type User, type InsertNews, type News } from "@shared/schema";
import { eq, desc, ilike, or, count } from "drizzle-orm";
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
  
  getNews(params?: { category?: string, search?: string, page?: number, limit?: number }): Promise<{ items: News[], total: number }>;
  getNewsById(id: string): Promise<News | undefined>;
  getNewsByUrl(sourceUrl: string): Promise<News | undefined>;
  createNews(newsData: InsertNews): Promise<News>;
  deleteNews(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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

  async deleteNews(id: string): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }
}

export const storage = new DatabaseStorage();
