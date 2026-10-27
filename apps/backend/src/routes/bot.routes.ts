import { Router } from 'express';
import { 
  getBotRules, 
  createBotRule, 
  updateBotRule, 
  deleteBotRule 
} from '../controllers/bot.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR];

router.get('/', authorize(allowedRoles), getBotRules);
router.post('/', authorize(allowedRoles), createBotRule);
router.put('/:id', authorize(allowedRoles), updateBotRule);
router.delete('/:id', authorize(allowedRoles), deleteBotRule);

export default router;
