import { Router } from 'express';
import { 
  createContact, 
  getContacts, 
  updateContact, 
  deleteContact,
  importContacts
} from '../controllers/contact.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR];

import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

router.post('/', authorize(allowedRoles), createContact);
router.post('/import', authorize(allowedRoles), upload.single('file'), importContacts);
router.get('/', authorize(allowedRoles), getContacts);
router.put('/:id', authorize(allowedRoles), updateContact);
router.delete('/:id', authorize(allowedRoles), deleteContact);

export default router;
