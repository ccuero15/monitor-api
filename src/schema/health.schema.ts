import { z } from "zod";
import { isIP } from "net";

export const IngestDataSchema = z.object({
  hostname: z.string().min(1),
  ipAddress: z.string().refine((val) => isIP(val) !== 0, {
    message: "Valida que sea una IP real (v4 o v6)"
  }),
  osInfo: z.string().optional(),
  cpuUsage: z.number().min(0).max(100),
  ramUsage: z.number().min(0).max(100),
  diskUsage: z.number().min(0).max(100),
  processes: z.array(z.object({
    pid: z.number().int(),
    name: z.string(),
    cpuUsage: z.number(),
    ramUsage: z.number()
  }))
});

export type IngestDataInput = z.infer<typeof IngestDataSchema>;
