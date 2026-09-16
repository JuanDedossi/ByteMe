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

// Temporary request logger: prints method, path, and origin to stdout.
// Used to diagnose LAN dev testing from a phone (e.g. to tell whether a
// request actually reached the server vs got stuck at Vite proxy or
// in the phone browser). Strip once the issue is identified.
app.use((req, _res, next) => {
  console.log(
    `[req] ${req.method} ${req.originalUrl} origin=${req.headers.origin ?? '-'}`,
  );
  next();
});

// CORS: parse comma-separated list of allowed origins from env, or fall
// back to '*' for dev convenience. Single origin like 'http://x.com' is
// also accepted (split yields a 1-element array). This matters when
// accessing the dev server from a phone on the LAN — the origin will
// be the laptop's LAN IP (e.g. http://192.168.1.10:5173), not
// localhost:5173, so a single-origin env value locks out the phone.
//
// `allowedHeaders` and `exposedHeaders` are explicit. The default cors
// behavior already echoes requested headers, but listing
// 'x-app-token' explicitly avoids subtle cases where the preflight
// rejects a custom Authorization-style header from the browser.
const allowedOrigins = (process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*'
      ? '*'
      : allowedOrigins,
    allowedHeaders: ['Content-Type', 'x-app-token'],
    exposedHeaders: ['x-app-token'],
  }),
);
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
