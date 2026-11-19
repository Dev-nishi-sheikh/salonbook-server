import { Router } from 'express';
import {
  getServices,
  getServiceCategories,
  getServiceById,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getFeaturedServices,
} from '../controllers/serviceController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validate';
import { serviceSchema, updateServiceSchema, querySchema, idParamSchema } from '../utils/validators';
import { UserRole } from '../types';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/featured', getFeaturedServices);
router.get('/categories', getServiceCategories);
router.get('/', validateQuery(querySchema), getServices);
router.get('/:id', validateParams(idParamSchema), getServiceById);

router.post('/', authenticate, authorize(UserRole.ADMIN), upload.single('image'), validate(serviceSchema), createService);
router.put('/:id', authenticate, authorize(UserRole.ADMIN), upload.single('image'), validateParams(idParamSchema), validate(updateServiceSchema), updateService);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), deleteService);
router.patch('/:id/toggle', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), toggleServiceStatus);

export default router;