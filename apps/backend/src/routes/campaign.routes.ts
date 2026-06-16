import { Router } from 'express';
import { 
  createCampaign, 
  getCampaigns, 
  getCampaignRecipients 
} from '../controllers/campaign.controller';
import { authenticate } from '../middlewares/auth';
import { authorize, ROLES } from '../middlewares/rbac';

const router = Router();

router.use(authenticate);

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR];

router.post('/', authorize(allowedRoles), createCampaign);
router.get('/', authorize(allowedRoles), getCampaigns);
router.get('/:id/recipients', authorize(allowedRoles), getCampaignRecipients);

export default router;
