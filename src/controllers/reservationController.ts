import { Request, Response } from 'express';
import prisma from '@/config/db';
import { sendMessage } from '@/utils/responseHelper';

// Obtener todas las reservas (admin/tesorero)
export const getAllReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, date, userId } = req.query;
    
    // Construir filtros
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (date) {
      filter.date = new Date(date as string);
    }
    
    if (userId) {
      filter.userId = Number(userId);
    }
    
    const reservations = await prisma.reservation.findMany({
      where: filter,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        schedule: true,
      },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    
    sendMessage(res, 'RESERVATION_LIST_RETRIEVED', reservations);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    sendMessage(res, 'RESERVATION_FETCH_ERROR');
  }
};

// Obtener reservas del usuario actual
export const getUserReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendMessage(res, 'RESERVATION_NOT_AUTHENTICATED');
      return;
    }
    
    const { status } = req.query;
    
    // Construir filtro
    const filter: any = {
      userId: req.user.id,
    };
    
    if (status) {
      filter.status = status;
    }
    
    const reservations = await prisma.reservation.findMany({
      where: filter,
      include: {
        schedule: true,
      },
      orderBy: [
        { date: 'asc' },
      ],
    });
    
    sendMessage(res, 'RESERVATION_USER_LIST_RETRIEVED', reservations);
  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    sendMessage(res, 'RESERVATION_FETCH_ERROR');
  }
};

// Obtener una reserva por ID
export const getReservationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        schedule: true,
        paymentRecords: req.user?.role === 'USER' ? false : true,
      },
    });
    
    if (!reservation) {
      sendMessage(res, 'RESERVATION_NOT_FOUND');
      return;
    }
    
    // Si el usuario no es admin ni tesorero, verificar que la reserva sea del usuario
    if (req.user?.role === 'USER' && reservation.userId !== req.user.id) {
      sendMessage(res, 'RESERVATION_INSUFFICIENT_PERMISSIONS');
      return;
    }
    
    sendMessage(res, 'RESERVATION_RETRIEVED', reservation);
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    sendMessage(res, 'RESERVATION_FETCH_ERROR');
  }
};

// Crear una nueva reserva
export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendMessage(res, 'RESERVATION_NOT_AUTHENTICATED');
      return;
    }
    
    const { scheduleId, date } = req.body;
    
    // Validar datos de entrada
    if (!scheduleId || !date) {
      sendMessage(res, 'RESERVATION_MISSING_REQUIRED_FIELDS');
      return;
    }
    
    // Verificar si el horario existe
    const schedule = await prisma.swimmingSchedule.findUnique({
      where: { id: Number(scheduleId) },
    });
    
    if (!schedule) {
      sendMessage(res, 'SCHEDULE_NOT_FOUND');
      return;
    }
    
    // Verificar si el horario está activo
    if (!schedule.isActive) {
      sendMessage(res, 'SCHEDULE_INACTIVE');
      return;
    }
    
    // Verificar disponibilidad
    const reservationDate = new Date(date);
    const existingReservationsCount = await prisma.reservation.count({
      where: {
        scheduleId: Number(scheduleId),
        date: reservationDate,
        status: {
          not: 'CANCELLED',
        },
      },
    });
    
    if (existingReservationsCount >= schedule.maxCapacity) {
      sendMessage(res, 'RESERVATION_NO_CAPACITY');
      return;
    }
    
    // Verificar si el usuario ya tiene una reserva en ese horario y fecha
    const existingUserReservation = await prisma.reservation.findFirst({
      where: {
        userId: req.user.id,
        scheduleId: Number(scheduleId),
        date: reservationDate,
        status: {
          not: 'CANCELLED',
        },
      },
    });
    
    if (existingUserReservation) {
      sendMessage(res, 'RESERVATION_ALREADY_EXISTS');
      return;
    }
    
    // Crear la reserva
    const newReservation = await prisma.reservation.create({
      data: {
        userId: req.user.id,
        scheduleId: Number(scheduleId),
        date: reservationDate,
        status: 'PENDING',
        isPaid: false,
      },
      include: {
        schedule: true,
      },
    });
    
    sendMessage(res, 'RESERVATION_CREATED', newReservation);
  } catch (error) {
    console.error('Error al crear reserva:', error);
    sendMessage(res, 'RESERVATION_CREATE_ERROR');
  }
};

// Cancelar una reserva (usuario, admin)
export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendMessage(res, 'RESERVATION_NOT_AUTHENTICATED');
      return;
    }
    
    const { id } = req.params;
    
    // Obtener la reserva
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });
    
    if (!reservation) {
      sendMessage(res, 'RESERVATION_NOT_FOUND');
      return;
    }
    
    // Verificar permisos
    if (req.user.role === 'USER' && reservation.userId !== req.user.id) {
      sendMessage(res, 'RESERVATION_CANCEL_INSUFFICIENT_PERMISSIONS');
      return;
    }
    
    // No permitir cancelar una reserva ya completada
    if (reservation.status === 'COMPLETED') {
      sendMessage(res, 'RESERVATION_CANNOT_CANCEL_COMPLETED');
      return;
    }
    
    // Actualizar estado de la reserva
    const updatedReservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: {
        status: 'CANCELLED',
      },
      include: {
        schedule: true,
      },
    });
    
    sendMessage(res, 'RESERVATION_CANCELLED', { reservation: updatedReservation });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    sendMessage(res, 'RESERVATION_CANCEL_ERROR');
  }
};

// Confirmar pago de reserva (tesorero, admin)
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendMessage(res, 'RESERVATION_NOT_AUTHENTICATED');
      return;
    }
    
    const { id } = req.params;
    const { amount, paymentMethod, notes } = req.body;
    
    if (!amount || !paymentMethod) {
      sendMessage(res, 'RESERVATION_MISSING_PAYMENT_DATA');
      return;
    }
    
    // Obtener la reserva
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });
    
    if (!reservation) {
      sendMessage(res, 'RESERVATION_NOT_FOUND');
      return;
    }
    
    // No permitir confirmar pago de una reserva cancelada
    if (reservation.status === 'CANCELLED') {
      sendMessage(res, 'RESERVATION_CANNOT_CONFIRM_CANCELLED');
      return;
    }
    
    // Actualizar la reserva
    const updatedReservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: {
        isPaid: true,
        paymentDate: new Date(),
        paymentConfirmedBy: req.user.id,
        status: 'CONFIRMED',
      },
    });
    
    // Registrar el pago
    await prisma.paymentRecord.create({
      data: {
        reservationId: Number(id),
        amount: Number(amount),
        paymentMethod,
        confirmedById: req.user.id,
        notes: notes || '',
      },
    });
    
    sendMessage(res, 'RESERVATION_PAYMENT_CONFIRMED', { reservation: updatedReservation });
  } catch (error) {
    console.error('Error al confirmar pago:', error);
    sendMessage(res, 'RESERVATION_PAYMENT_ERROR');
  }
};

// Marcar reserva como completada (admin)
export const completeReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Obtener la reserva
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });
    
    if (!reservation) {
      sendMessage(res, 'RESERVATION_NOT_FOUND');
      return;
    }
    
    // No permitir completar una reserva cancelada
    if (reservation.status === 'CANCELLED') {
      sendMessage(res, 'RESERVATION_CANNOT_COMPLETE_CANCELLED');
      return;
    }
    
    // Actualizar estado de la reserva
    const updatedReservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: {
        status: 'COMPLETED',
      },
    });
    
    sendMessage(res, 'RESERVATION_COMPLETED', { reservation: updatedReservation });
  } catch (error) {
    console.error('Error al completar reserva:', error);
    sendMessage(res, 'RESERVATION_COMPLETE_ERROR');
  }
}; 