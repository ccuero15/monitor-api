import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authenticateAgent from "./middlewares/auth";
import { IngestDataSchema } from "./schema/health.schema";
import prisma from "@/lib/prisma";
import { Prisma } from "generated/prisma/client";
import healthRoutes from "@/routes/healt";
dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" }
});
app.use(limiter);
app.use("/api/v1/health", healthRoutes);
// --- RUTA DE INGESTA (POST) ---
/* app.post("/api/v1/health", authenticateAgent, async (req: Request, res: Response) => {
  console.log(`[${new Date().toISOString()}] 📥 Recibida petición de: ${req.body.hostname} (${req.body.ipAddress})`);
  console.log("DB URL cargada:", process.env.DATABASE_URL);
  try {
    // 1. Validar el cuerpo de la petición (incluyendo ipAddress y hostname)
    const validatedData = IngestDataSchema.parse(req.body);

    // 2. Mapear los procesos (Solo si el bash decide enviarlos)
    const mappedProcesses = validatedData.processes.map(p => ({
      pid: p.pid,
      processName: p.name,
      cpuPercent: p.cpuUsage,
      memPercent: p.ramUsage,

    }));

    // 3. Transacción Atómica con Cero Any
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // A. Buscar o Crear el servidor basado en la IP única
      const server = await tx.server.upsert({
        where: { ipAddress: validatedData.ipAddress },
        update: { 
          hostname: validatedData.hostname,
          osInfo: validatedData.osInfo || "Unknown" 
        },
        create: {
          ipAddress: validatedData.ipAddress,
          hostname: validatedData.hostname,
          osInfo: validatedData.osInfo || "Unknown",
        },
      });

      // B. Registrar el HealthCheck vinculado al servidor
      return await tx.healthCheck.create({
        data: {
          serverId: server.id,
          cpuUsage: validatedData.cpuUsage,
          ramUsage: validatedData.ramUsage,
          diskUsage: validatedData.diskUsage,
          topProcesses: {
            create: mappedProcesses
          }
        }
      });
    });

    res.status(201).json({ 
      message: "Data ingested successfully", 
      id: result.id.toString(),
      serverId: result.serverId 
    });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
       res.status(400).json({ error: "Invalid data format or missing IP/Hostname" });
       return;
    }
    
    console.error("[DATABASE_ERROR]:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}); */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Security API running on port ${PORT}`));