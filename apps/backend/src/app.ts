import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

// Initialize express app
const app: Application = express();

// Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Middlewares
app.use(helmet());
app.use(cors({ origin: '*' })); // Adjust in production
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

import authRoutes from './routes/auth.routes';
import waRoutes from './routes/wa.routes';
import contactRoutes from './routes/contact.routes';
import contactGroupRoutes from './routes/contactGroup.routes';
import templateRoutes from './routes/template.routes';
import campaignRoutes from './routes/campaign.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wa', waRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/contact-groups', contactGroupRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

export default app;
