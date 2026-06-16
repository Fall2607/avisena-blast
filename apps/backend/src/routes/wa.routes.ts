import { Router } from 'express';
import { 
  createSession, 
  getQR, 
  getStatus, 
  listSessions, 
  disconnectSession 
} from '../controllers/wa.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

// Apply authentication to all WA routes
router.use(authenticate);

// Allowed roles: Super Admin, Admin
router.post('/session', authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN]), createSession);
router.get('/session/:sessionName/qr', authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN]), getQR);
router.get('/session/:sessionName/status', authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR]), getStatus);
router.get('/sessions', authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR]), listSessions);
router.delete('/session/:sessionName', authorize([ROLES.SUPER_ADMIN, ROLES.ADMIN]), disconnectSession);

export default router;
