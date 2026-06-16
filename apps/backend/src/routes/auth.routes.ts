import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

router.post('/login', login);
router.post('/register', authenticate, authorize([ROLES.SUPER_ADMIN]), register);

export default router;
