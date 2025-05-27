import { Request, Response } from 'express';
import prisma from '@/config/db';

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
    
    res.json(reservations);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
};

// Obtener reservas del usuario actual
export const getUserReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
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
    
    res.json(reservations);
  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    res.status(500).json({ error: 'Error al obtener reservas del usuario' });
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
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    
    // Si el usuario no es admin ni tesorero, verificar que la reserva sea del usuario
    if (req.user?.role === 'USER' && reservation.userId !== req.user.id) {
      res.status(403).json({ error: 'No tienes permiso para ver esta reserva' });
      return;
    }
    
    res.json(reservation);
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({ error: 'Error al obtener información de la reserva' });
  }
};

// Crear una nueva reserva
export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    
    const { scheduleId, date } = req.body;
    
    // Validar datos de entrada
    if (!scheduleId || !date) {
      res.status(400).json({ error: 'Por favor proporciona el ID del horario y la fecha' });
      return;
    }
    
    // Verificar si el horario existe
    const schedule = await prisma.swimmingSchedule.findUnique({
      where: { id: Number(scheduleId) },
    });
    
    if (!schedule) {
      res.status(404).json({ error: 'Horario no encontrado' });
      return;
    }
    
    // Verificar si el horario está activo
    if (!schedule.isActive) {
      res.status(400).json({ error: 'Este horario no está disponible' });
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
      res.status(400).json({ error: 'No hay cupos disponibles para este horario en la fecha seleccionada' });
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
      res.status(400).json({ error: 'Ya tienes una reserva para este horario en la fecha seleccionada' });
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
    
    res.status(201).json(newReservation);
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({ error: 'Error al crear reserva' });
  }
};

// Cancelar una reserva (usuario, admin)
export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    
    const { id } = req.params;
    
    // Obtener la reserva
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });
    
    if (!reservation) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    
    // Verificar permisos
    if (req.user.role === 'USER' && reservation.userId !== req.user.id) {
      res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });
      return;
    }
    
    // No permitir cancelar una reserva ya completada
    if (reservation.status === 'COMPLETED') {
      res.status(400).json({ error: 'No se puede cancelar una reserva ya completada' });
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
    
    res.json({
      message: 'Reserva cancelada correctamente',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ error: 'Error al cancelar reserva' });
  }
};

// Confirmar pago de reserva (tesorero, admin)
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    
    const { id } = req.params;
    const { amount, paymentMethod, notes } = req.body;
    
    if (!amount || !paymentMethod) {
      res.status(400).json({ error: 'Por favor proporciona el monto y método de pago' });
      return;
    }
    
    // Obtener la reserva
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });
    
    if (!reservation) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    
    // No permitir confirmar pago de una reserva cancelada
    if (reservation.status === 'CANCELLED') {
      res.status(400).json({ error: 'No se puede confirmar el pago de una reserva cancelada' });
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
    
    res.json({
      message: 'Pago confirmado correctamente',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error al confirmar pago:', error);
    res.status(500).json({ error: 'Error al confirmar pago de la reserva' });
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
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    
    // No permitir completar una reserva cancelada
    if (reservation.status === 'CANCELLED') {
      res.status(400).json({ error: 'No se puede completar una reserva cancelada' });
      return;
    }
    
    // Actualizar estado de la reserva
    const updatedReservation = await prisma.reservation.update({
      where: { id: Number(id) },
      data: {
        status: 'COMPLETED',
      },
    });
    
    res.json({
      message: 'Reserva marcada como completada',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error al completar reserva:', error);
    res.status(500).json({ error: 'Error al marcar reserva como completada' });
  }
}; 