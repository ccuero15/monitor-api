import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { PrismaClient } from 'generated/prisma/client';

dotenv.config();

// Creamos el Pool de conexiones manualmente
// Esto soluciona el error de "password must be a string"
const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL 
});

// Creamos el adaptador usando el pool instanciado
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Instanciamos el cliente usando el adaptador
export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;