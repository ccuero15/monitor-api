import { Router } from 'express';

import authenticateAgent from '../middlewares/auth';
import { HealthController } from '@/controllers/healt';

const router = Router();

// Endpoint que usa el script de Bash
router.post('/ingest', /*authenticateAgent,*/ HealthController.health);

// Endpoint que usará tu Dashboard de Next.js
router.get('/stream', HealthController.stream);

export default router;