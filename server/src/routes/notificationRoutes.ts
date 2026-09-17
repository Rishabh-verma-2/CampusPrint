import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/errorHandler';
import { NotificationService } from '../services/NotificationService';
import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await NotificationService.getForUser(req.user!._id, 30);
  res.json({ success: true, data: { notifications } });
}));

router.patch('/:id/read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const n = await NotificationService.markRead(req.params.id as string, req.user!._id);
  res.json({ success: true, data: { notification: n } });
}));

router.patch('/mark-all-read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await NotificationService.markAllRead(req.user!._id);
  res.json({ success: true, message: 'All marked as read' });
}));

export default router;
