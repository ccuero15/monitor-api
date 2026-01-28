import { Request, Response } from 'express';
import { IngestDataSchema } from '@/schema/health.schema';
import { Prisma } from 'generated/prisma/client';
import prisma from '@/lib/prisma';
import { metricsEvents, NEW_METRICS_EVENT } from '@/lib/event';
import { SSEMessage } from '@/types/server';


export const HealthController = {
    health: async (req: Request, res: Response) => {
        try {
            // 1. Validar el cuerpo de la petición
            const validatedData = IngestDataSchema.parse(req.body);

            // 2. Lógica de filtrado para PERSISTENCIA (Base de Datos)
            // Solo guardamos procesos si exceden el 75% de RAM
            const RAM_THRESHOLD = 75.0;
            const processesToSave = validatedData.processes
                .filter(p => p.ramUsage > RAM_THRESHOLD)
                .map(p => ({
                    pid: p.pid,
                    processName: p.name,
                    cpuPercent: p.cpuUsage,
                    memPercent: p.ramUsage,
                }));

            // 3. Transacción Atómica
            const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const server = await tx.server.upsert({
                    where: { 
                        ipAddress: validatedData.ipAddress, 
                        hostname: validatedData.hostname 
                    },
                    update: {
                        osInfo: validatedData.osInfo || "Unknown"
                    },
                    create: {
                        ipAddress: validatedData.ipAddress,
                        hostname: validatedData.hostname,
                        osInfo: validatedData.osInfo || "Unknown",
                    },
                });

                return await tx.healthCheck.create({
                    data: {
                        serverId: server.id,
                        cpuUsage: validatedData.cpuUsage,
                        ramUsage: validatedData.ramUsage,
                        diskUsage: validatedData.diskUsage,
                        topProcesses: {
                            create: processesToSave // Solo los filtrados (>75%)
                        }
                    }
                });
            });

            // 4. Respuesta inmediata al Agente
            res.status(201).json({
                message: "Data ingested successfully",
                id: result.id.toString(),
                serverId: result.serverId
            });

            // 5. EMISIÓN EN TIEMPO REAL (Stream)
            // Aquí enviamos TODO (sin filtrar) para que el Dashboard sea reactivo
            const streamData: SSEMessage = {
                serverId: result.serverId.toString(),
                hostname: validatedData.hostname,
                cpuUsage: validatedData.cpuUsage,
                ramUsage: validatedData.ramUsage,
                diskUsage: validatedData.diskUsage,
                processes: validatedData.processes.map(p => ({
                    pid: p.pid,
                    name: p.name,
                    cpuUsage: p.cpuUsage,
                    ramUsage: p.ramUsage
                }))
            };

            metricsEvents.emit(NEW_METRICS_EVENT, streamData);

        } catch (error: unknown) {
            if (error instanceof Error && error.name === "ZodError") {
                res.status(400).json({ error: "Invalid data format" });
                return;
            }
            console.error("[DATABASE_ERROR]:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    stream: (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        res.write('retry: 10000\n\n');
        res.write(': ok\n\n');

        // Eliminamos el 'any' y usamos la interfaz correcta
        const sendEvent = (data: SSEMessage) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 60000);

        metricsEvents.on(NEW_METRICS_EVENT, sendEvent);

        req.on('close', () => {
            metricsEvents.off(NEW_METRICS_EVENT, sendEvent);
            clearInterval(heartbeat);
            res.end();
        });
    }
};