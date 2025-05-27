import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { notFound, errorHandler } from '@/middleware/errorMiddleware';
import { sendMessage } from '@/utils/responseHelper';

// Importar rutas
import authRoutes from '@/routes/authRoutes';
import scheduleRoutes from '@/routes/scheduleRoutes';
import reservationRoutes from '@/routes/reservationRoutes';
import userRoutes from '@/routes/userRoutes';



// Cargar variables de entorno
dotenv.config();

// Inicializar express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://farancibiat.cl',
    'https://www.farancibiat.cl',
    'https://swim.farancibiat.cl'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', userRoutes);

// Ruta principal
app.get('/', (_req, res) => {
  sendMessage(res, 'APP_WELCOME');
});

// Middleware de errores
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

export default app; 