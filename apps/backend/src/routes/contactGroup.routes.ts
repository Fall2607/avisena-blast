import { Router } from 'express';
import { 
  createGroup, 
  getGroups, 
  updateGroup, 
  deleteGroup 
} from '../controllers/contactGroup.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

// Allowed roles: Super Admin, Admin, Operator
const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR];

router.post('/', authorize(allowedRoles), createGroup);
router.get('/', authorize(allowedRoles), getGroups);
router.put('/:id', authorize(allowedRoles), updateGroup);
router.delete('/:id', authorize(allowedRoles), deleteGroup);

export default router;
