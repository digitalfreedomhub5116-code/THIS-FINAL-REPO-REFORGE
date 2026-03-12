import type { Express, Request, Response } from "express";
import { authStorage } from "./storage.js";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const user = req.user as { claims?: Record<string, unknown> };
      const userId = user?.claims?.['sub'] as string;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const dbUser = await authStorage.getUser(userId);
      res.json(dbUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
