import { Router } from 'express';
import { register, login, logout, getMe, refresh, studentQuickAccess } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/student-session', studentQuickAccess);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/refresh', refresh);

export default router;
