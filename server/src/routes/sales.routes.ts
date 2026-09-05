import { Router, Request, Response, NextFunction } from 'express';
import {
  findAllSales,
  getSaleStats,
  getSalesSummary,
  getSalesBreakdown,
  createSale,
} from '../services/sales.service';
import { validate } from '../middleware/validate';
import { CreateSaleSchema } from '../validation/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);

    // Se agrega T00:00:00 para que JS lo parsee en zona horaria local y no UTC
    const dateFromStr = req.query.dateFrom as string;
    const dateToStr = req.query.dateTo as string;
    const dateFrom = dateFromStr ? new Date(`${dateFromStr}T00:00:00`) : undefined;
    const dateTo = dateToStr ? new Date(`${dateToStr}T00:00:00`) : undefined;

    // Si dateTo viene sin hora, extenderlo al final del día
    if (dateTo && !isNaN(dateTo.getTime())) {
      dateTo.setHours(23, 59, 59, 999);
    }

    const { data, total } = await findAllSales(
      page,
      limit,
      dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
      dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
    );
    res.json({
      success: true,
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getSaleStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // REQ-SS-1 / REQ-SS-2: dateFrom/dateTo as YYYY-MM-DD, dateTo inclusive of full local day.
    const dateFromStr = req.query.dateFrom as string;
    const dateToStr = req.query.dateTo as string;
    const dateFrom = dateFromStr ? new Date(`${dateFromStr}T00:00:00`) : undefined;
    const dateTo = dateToStr ? new Date(`${dateToStr}T00:00:00`) : undefined;

    if (dateTo && !isNaN(dateTo.getTime())) {
      dateTo.setHours(23, 59, 59, 999);
    }

    const data = await getSalesSummary(
      dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
      dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/breakdown', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFromStr = req.query.dateFrom as string;
    const dateToStr = req.query.dateTo as string;
    const dateFrom = dateFromStr ? new Date(`${dateFromStr}T00:00:00`) : undefined;
    const dateTo = dateToStr ? new Date(`${dateToStr}T00:00:00`) : undefined;

    if (dateTo && !isNaN(dateTo.getTime())) {
      dateTo.setHours(23, 59, 59, 999);
    }

    const parsedLimit = parseInt(req.query.limit as string, 10);
    const parsedOffset = parseInt(req.query.offset as string, 10);
    const limit = Math.min(100, parsedLimit > 0 ? parsedLimit : 10);
    const offset = Math.max(0, parsedOffset || 0);

    const data = await getSalesBreakdown({
      dateFrom: dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
      dateTo: dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
      limit,
      offset,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateSaleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createSale(req.body);
    res.json({
      success: true,
      data,
      message: 'Venta registrada exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
