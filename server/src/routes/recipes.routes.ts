import { Router, Request, Response, NextFunction } from 'express';
import {
  findAllRecipes,
  findRecipeById,
  createRecipe,
  updateRecipe,
  updateRecipePrice,
  updateRecipeStock,
  toggleRecipeActive,
  deleteRecipe,
} from '../services/recipes.service';
import { validate } from '../middleware/validate';
import {
  CreateRecipeSchema,
  UpdateRecipeSchema,
  UpdateStockSchema,
  UpdateRecipePriceSchema,
} from '../validation/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
    const search = req.query.search as string | undefined;
    const isSubRecipe =
      req.query.isSubRecipe === 'true'
        ? true
        : req.query.isSubRecipe === 'false'
          ? false
          : undefined;
    const sortByStock = req.query.sortByStock === 'true';
    const hasStock = req.query.hasStock === 'true' ? true : undefined;

    const { data, total } = await findAllRecipes(page, limit, search, isSubRecipe, sortByStock, hasStock);
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
    const data = await findRecipeById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateRecipeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createRecipe(req.body);
    res.json({ success: true, data, message: 'Receta creada exitosamente' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(UpdateRecipeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateRecipe(id, req.body);
    res.json({
      success: true,
      data,
      message: 'Receta actualizada exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/stock', validate(UpdateStockSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateRecipeStock(id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/price', validate(UpdateRecipePriceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateRecipePrice(id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle-active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await toggleRecipeActive(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await deleteRecipe(id);
    res.json({ success: true, message: 'Receta eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
