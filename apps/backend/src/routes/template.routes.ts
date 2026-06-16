import { Router } from 'express';
import { 
  createTemplate, 
  getTemplates, 
  updateTemplate, 
  deleteTemplate 
} from '../controllers/template.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR];

router.post('/', authorize(allowedRoles), createTemplate);
router.get('/', authorize(allowedRoles), getTemplates);
router.put('/:id', authorize(allowedRoles), updateTemplate);
router.delete('/:id', authorize(allowedRoles), deleteTemplate);

export default router;
