import { Router } from 'express';
import {
  getUsers,
  getUserById,
  blockUnblockUser,
  updateUserRole,
  getDashboardStats,
  deleteUser,
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validateParams, validateQuery } from '../middleware/validate';
import { querySchema, idParamSchema, blockUserSchema, roleUpdateSchema } from '../utils/validators';
import { UserRole } from '../types';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/', authenticate, authorize(UserRole.ADMIN), validateQuery(querySchema), getUsers);
router.get('/:id', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), getUserById);
router.patch('/:id/block', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), validate(blockUserSchema), blockUnblockUser);
router.patch('/:id/role', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), validate(roleUpdateSchema), updateUserRole);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), deleteUser);

export default router;