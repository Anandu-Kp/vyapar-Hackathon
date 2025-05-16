import express from 'express';
import { processDocsController } from './generate-docs/controller.js';

const router = express.Router();

router.post('/process-docs', processDocsController);

export default router;