import type { Request, Response, NextFunction } from "express";

export default function authenticateAgent(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.header("X-API-KEY"); 

    if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
        res.status(401).json({ error: "Unauthorized: Invalid API Key" });
        return;
    }
    next();
}


