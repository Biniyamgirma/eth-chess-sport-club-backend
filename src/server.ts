import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import brilliantMoveRoutes from './routes/brilliant-move.routes.js';
import memberRoutes from './routes/member.routes.js';
import venueRoutes from './routes/venue.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import venueTableRoutes from './routes/venue-table.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import lookupRoutes from './routes/lookup.routes.js';
import matchRoutes from './routes/match.routes.js';
import matchInvoiceRoutes from './routes/match-invoice.routes.js';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(helmet.default());
app.use(
  rateLimit.default({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'EthChess backend is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/brilliant-moves', brilliantMoveRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api', venueTableRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/match-invoices', matchInvoiceRoutes);

app.use((_req, _res, next) => {
  next(new Error('Route not found'));
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});

export default app;
