import { Router, Request, Response, NextFunction } from 'express';
import {
  findAllIngredients,
  findIngredientById,
  registerPurchase,
  updateIngredient,
  deleteIngredient,
  checkIngredientInUse,
} from '../services/ingredients.service';
import { validate } from '../middleware/validate';
import {
  RegisterPurchaseSchema,
  UpdateIngredientSchema,
} from '../validation/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
    const search = req.query.search as string | undefined;

    const { data, total } = await findAllIngredients(page, limit, search);
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
    const data = await findIngredientById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/purchase', validate(RegisterPurchaseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await registerPurchase(req.body);
    res.json({
      success: true,
      data,
      message: 'Compra registrada exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(UpdateIngredientSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateIngredient(id, req.body);
    res.json({ success: true, data, message: 'Ingrediente actualizado' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const inUse = await checkIngredientInUse(id);
    if (inUse) {
      res.status(409).json({
        success: false,
        error:
          'No se puede eliminar un ingrediente en uso por recetas activas',
      });
      return;
    }
    await deleteIngredient(id);
    res.json({ success: true, message: 'Ingrediente eliminado' });
  } catch (err) {
    next(err);
  }
});

export default router;
