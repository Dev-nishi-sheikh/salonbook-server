import { Router } from 'express';
import { register, login, googleAuth, getMe, logout, updateProfile, getToken } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema } from '../utils/validators';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/token', authenticate, getToken);

export default router;