import express, { Router } from 'express';
import { register, login, getProfile, updateProfile } from '@/controllers/authController';
import { protect } from '@/config/auth';

const router: Router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router; 