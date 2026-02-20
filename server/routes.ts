import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { fetchNews, setupCron } from "./scraper";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user?.isAdmin) return next();
    res.status(401).json({ message: "Admin access required" });
  };

  // Auth Routes
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const hashedPassword = await hashPassword(req.body.password);
      
      const isFirstUser = await storage.getUserByUsername("admin") === undefined; // Quick hack, or check count of users
      // Create user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: false // Can be changed in db manually, but maybe make first user admin?
      });
      
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // News Routes
  app.get(api.news.list.path, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    
    const { items, total } = await storage.getNews({ category, search, page, limit: 12 });
    res.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / 12)
    });
  });

  app.get(api.news.get.path, async (req, res) => {
    const news = await storage.getNewsById(req.params.id);
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json(news);
  });

  app.delete(api.news.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteNews(req.params.id);
    res.status(204).end();
  });

  app.post(api.news.fetchNow.path, requireAdmin, async (req, res) => {
    const count = await fetchNews();
    res.json({ message: "Fetch completed", count });
  });

  // Start the background cron job
  setupCron();
  
  // Seed the DB if it's empty
  storage.getNews({ limit: 1 }).then(({ total }) => {
    if (total === 0) {
      console.log('Seeding initial news...');
      fetchNews().catch(console.error);
    }
  });

  return httpServer;
}
