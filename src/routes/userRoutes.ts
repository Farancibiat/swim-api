import express, { Router } from 'express';
import { getUsers, getUserById, createUser } from '@/controllers/userController';
import { protect, authorize } from '@/config/auth';
import { Role } from '@prisma/client';

const router: Router = express.Router();

// Solo administradores pueden ver y crear usuarios
router.get('/', protect, authorize([Role.ADMIN]), getUsers);
router.get('/:id', protect, authorize([Role.ADMIN]), getUserById);
router.post('/', protect, authorize([Role.ADMIN]), createUser);

export default router; 