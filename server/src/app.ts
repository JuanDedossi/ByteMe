import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './db';
import ingredientsRoutes from './routes/ingredients.routes';
import recipesRoutes from './routes/recipes.routes';
import salesRoutes from './routes/sales.routes';
import profitRulesRoutes from './routes/profit-rules.routes';
import traysRoutes from './routes/trays.routes';
import complementsRoutes from './routes/complements.routes';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Connect to DB before handling any request
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Routes — mounted at /api/* (prefix added here, not in vercel.json)
app.use('/api/health', healthRoutes);

// Ruta de autenticación sin authMiddleware, para obtener el token
app.use('/api/auth', authRoutes);

// Auth requerido para todas las rutas operativas
app.use(authMiddleware);

app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/profit-rules', profitRulesRoutes);
app.use('/api/trays', traysRoutes);
app.use('/api/complements', complementsRoutes);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(status).json({ success: false, error: message });
});

export default app;
