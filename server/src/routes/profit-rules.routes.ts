import { Router, Request, Response, NextFunction } from 'express';
import {
  findAllProfitRules,
  findProfitRuleById,
  createProfitRule,
  updateProfitRule,
  deleteProfitRule,
} from '../services/profit-rules.service';
import { validate } from '../middleware/validate';
import {
  CreateProfitRuleSchema,
  UpdateProfitRuleSchema,
} from '../validation/schemas';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await findAllProfitRules();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await findProfitRuleById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(CreateProfitRuleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createProfitRule(req.body);
    res.json({ success: true, data, message: 'Regla creada exitosamente' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(UpdateProfitRuleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = await updateProfitRule(id, req.body);
    res.json({
      success: true,
      data,
      message: 'Regla actualizada exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await deleteProfitRule(id);
    res.json({ success: true, message: 'Regla eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
