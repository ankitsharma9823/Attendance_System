import { Router } from 'express';
import * as holidayController from './holiday.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/mine', authenticate, holidayController.getMyRequests);       // employee sees own
router.post('/', authenticate, holidayController.createRequest);           // employee submits
router.get('/all', authenticate, holidayController.getAllRequests);         // admin sees all
router.patch('/:id/status', authenticate, holidayController.updateStatus); // admin replies + sets status

export default router;