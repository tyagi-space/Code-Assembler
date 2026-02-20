import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { fetchNews, setupCron } from "./scraper";
import { registerUserSchema } from "@shared/schema";
import { sendAdminDecisionEmail } from "./mailer";

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
      const payload = registerUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(payload.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(payload.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const hashedPassword = await hashPassword(payload.password);
      const requestedAdmin = payload.requestedRole === "admin";
      const user = await storage.createUser({
        username: payload.username,
        email: payload.email,
        password: hashedPassword,
        isAdmin: requestedAdmin,
        isActive: !requestedAdmin,
        isDeleted: false,
        adminStatus: requestedAdmin ? "pending" : "approved",
      });

      const { password, ...userWithoutPassword } = user;

      if (requestedAdmin) {
        return res.status(201).json({
          user: userWithoutPassword,
          autoLogin: false,
          message:
            "Admin registration submitted. Wait for approval from an existing admin.",
        });
      }

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        res.status(201).json({
          user: userWithoutPassword,
          autoLogin: true,
          message: "Account created successfully.",
        });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          message: info?.message || "Invalid username or password",
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const news = await storage.getNewsById(id);
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json(news);
  });

  app.delete(api.news.delete.path, requireAdmin, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await storage.deleteNews(id);
    res.status(204).end();
  });

  app.post(api.news.deleteByCategory.path, requireAdmin, async (req, res) => {
    const category = String(req.body?.category || "").trim();
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }
    const count = await storage.deleteNewsByCategory(category);
    res.json({ message: `Deleted ${count} articles in ${category}`, count });
  });

  app.post(api.news.deleteByDate.path, requireAdmin, async (req, res) => {
    const date = String(req.body?.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
    }
    const count = await storage.deleteNewsByDate(date);
    res.json({ message: `Deleted ${count} articles for ${date}`, count });
  });

  app.post(api.news.fetchNow.path, requireAdmin, async (req, res) => {
    const count = await fetchNews();
    res.json({ message: "Fetch completed", count });
  });

  // Explicit admin-only endpoint for manual scraping.
  app.post(api.admin.scrapeNow.path, requireAdmin, async (_req, res) => {
    const count = await fetchNews();
    res.json({ message: "Manual scrape completed", count });
  });

  app.get(api.admin.pendingRequests.path, requireAdmin, async (_req, res) => {
    const users = await storage.getPendingAdminUsers();
    const sanitized = users.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  });

  app.post(api.admin.approveRequest.path, requireAdmin, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await storage.approveAdminUser(id);
    if (!updated) return res.status(404).json({ message: "User not found" });

    const { password, ...userWithoutPassword } = updated;
    await sendAdminDecisionEmail({
      to: updated.email,
      username: updated.username,
      approved: true,
    }).catch((error) => {
      console.error("Approval email failed:", error);
    });

    res.json({ message: "Admin request approved", user: userWithoutPassword });
  });

  app.post(api.admin.rejectRequest.path, requireAdmin, async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await storage.rejectAdminUser(id);
    if (!updated) return res.status(404).json({ message: "User not found" });

    const { password, ...userWithoutPassword } = updated;
    await sendAdminDecisionEmail({
      to: updated.email,
      username: updated.username,
      approved: false,
    }).catch((error) => {
      console.error("Rejection email failed:", error);
    });

    res.json({ message: "Admin request rejected", user: userWithoutPassword });
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
