import express, { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getAllReservations,
  getUserReservations,
  getReservationById,
  createReservation,
  cancelReservation,
  confirmPayment,
  completeReservation
} from '@/controllers/reservationController';
import { protect, authorize } from '@/config/auth';

const router: Router = express.Router();

// Rutas para usuarios autenticados
router.get('/my-reservations', protect, getUserReservations);
router.post('/', protect, createReservation);
router.put('/:id/cancel', protect, cancelReservation);

// Rutas para administradores y tesoreros
router.get('/', protect, authorize([Role.ADMIN, Role.TREASURER]), getAllReservations);
router.put('/:id/confirm-payment', protect, authorize([Role.ADMIN, Role.TREASURER]), confirmPayment);

// Rutas para administradores
router.put('/:id/complete', protect, authorize([Role.ADMIN]), completeReservation);

// Ruta para todos (con restricciones en el controlador)
router.get('/:id', protect, getReservationById);

export default router; 