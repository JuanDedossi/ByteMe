import { Router, Request, Response, NextFunction } from 'express';
import {
  findAllTrays,
  findTrayById,
  createTray,
  updateTray,
  updateTrayPrice,
  updateTrayStock,
  deleteTray,
} from '../services/trays.service';
import { validate } from '../middleware/validate';
import { CreateTraySchema, UpdateTraySchema } from '../validation/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
    const search = req.query.search as string | undefined;
    const sortByStock = req.query.sortByStock === 'true';
    const hasStock = req.query.hasStock === 'true' ? true : undefined;

    const { data, total } = await findAllTrays(page, limit, search, sortByStock, hasStock);
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

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await findTrayById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateTraySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createTray(req.body);
    res.json({ success: true, data, message: 'Bandeja creada exitosamente' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(UpdateTraySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateTray(id, req.body);
    res.json({ success: true, data, message: 'Bandeja actualizada exitosamente' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/price', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateTrayPrice(id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateTrayStock(id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await deleteTray(id);
    res.json({ success: true, message: 'Bandeja eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
