import { Router } from 'express';
import {
  getTimeSlots,
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  getAllAppointments,
  updateAppointmentStatus,
  getAppointmentStats,
} from '../controllers/appointmentController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validate';
import { appointmentSchema, updateAppointmentStatusSchema, querySchema, idParamSchema } from '../utils/validators';
import { UserRole } from '../types';

const router = Router();

router.get('/time-slots', getTimeSlots);
router.get('/stats', authenticate, getAppointmentStats);
router.get('/my', authenticate, validateQuery(querySchema), getMyAppointments);
router.get('/:id', authenticate, validateParams(idParamSchema), getAppointmentById);
router.post('/', authenticate, authorize(UserRole.CUSTOMER), validate(appointmentSchema), createAppointment);
router.delete('/:id', authenticate, authorize(UserRole.CUSTOMER), validateParams(idParamSchema), cancelAppointment);

router.get('/', authenticate, authorize(UserRole.ADMIN), validateQuery(querySchema), getAllAppointments);
router.patch('/:id/status', authenticate, authorize(UserRole.ADMIN), validateParams(idParamSchema), validate(updateAppointmentStatusSchema), updateAppointmentStatus);

export default router;