import { Router, Request, Response, NextFunction } from 'express';
import {
  findAllComplements,
  findComplementById,
  createComplement,
  updateComplement,
  toggleComplementActive,
  deleteWithProtection,
} from '../services/complements.service';
import { validate } from '../middleware/validate';
import {
  CreateComplementSchema,
  UpdateComplementSchema,
} from '../validation/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
    const search = req.query.search as string | undefined;
    const isActiveRaw = req.query.isActive as string | undefined;
    const isActive =
      isActiveRaw === 'true'
        ? true
        : isActiveRaw === 'false'
          ? false
          : undefined;

    const { data, total } = await findAllComplements(
      page,
      limit,
      search,
      isActive,
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

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await findComplementById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validate(CreateComplementSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await createComplement(req.body);
      res.json({
        success: true,
        data,
        message: 'Complemento creado exitosamente',
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  validate(UpdateComplementSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = await updateComplement(id, req.body);
      res.json({
        success: true,
        data,
        message: 'Complemento actualizado exitosamente',
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/toggle-active',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = await toggleComplementActive(id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await deleteWithProtection(id);
      res.json({
        success: true,
        message: 'Complemento eliminado exitosamente',
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
