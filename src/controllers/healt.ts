import { Request, Response } from 'express';
import { IngestDataSchema } from '@/schema/health.schema';
import { Prisma } from 'generated/prisma/client';
import prisma from 'lib/prisma';
import { metricsEvents, NEW_METRICS_EVENT } from 'lib/event';

export const HealthController = {




    // El endpoint que ya tienes, pero ahora emite un evento
    health: async (req: Request, res: Response) => {

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
            // ... (Tu lógica actual de Prisma Upsert que ya funciona) ...
            // Al final, antes del res.json:
            res.status(201).json({
                message: "Data ingested successfully",
                id: result.id.toString(),
                serverId: result.serverId
            });

            metricsEvents.emit(NEW_METRICS_EVENT, {
                serverId: result.serverId,
                cpuUsage: validatedData.cpuUsage,
                ramUsage: validatedData.ramUsage,
                timestamp: new Date()
            });

        } catch (error: unknown) {
            if (error instanceof Error && error.name === "ZodError") {
                res.status(400).json({ error: "Invalid data format or missing IP/Hostname" });
                return;
            }

            console.error("[DATABASE_ERROR]:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }


    },

    // El nuevo endpoint de SSE para el Dashboard
    stream: (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // <--- AÑADE ESTO para evitar buffering en Nginx/Proxies
        console.log('conectado')


        res.write('retry: 10000\n\n');
        res.write(': ok\n\n');

        // Función para enviar datos al cliente
        const sendEvent = (data: any) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };


        // Suscribirse al bus de eventos
        metricsEvents.on(NEW_METRICS_EVENT, sendEvent);

        // Si el cliente (Dashboard) cierra la pestaña, limpiamos la suscripción
        req.on('close', () => {
            metricsEvents.off(NEW_METRICS_EVENT, sendEvent);
            console.log('desconectado')
            res.end();
        });
    }
};