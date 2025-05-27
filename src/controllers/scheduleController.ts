import { Request, Response } from 'express';
import prisma from '@/config/db';
import { sendMessage } from '@/utils/responseHelper';

// Obtener todos los horarios
export const getAllSchedules = async (_req: Request, res: Response): Promise<void> => {
  try {
    const schedules = await prisma.swimmingSchedule.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    sendMessage(res, 'SCHEDULE_LIST_RETRIEVED', schedules);
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    sendMessage(res, 'SCHEDULE_FETCH_ERROR');
  }
};

// Obtener un horario por ID
export const getScheduleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      sendMessage(res, 'SCHEDULE_INVALID_ID');
      return;
    }
    
    const schedule = await prisma.swimmingSchedule.findUnique({
      where: { id: Number(id) },
    });
    
    if (!schedule) {
      sendMessage(res, 'SCHEDULE_NOT_FOUND');
      return;
    }
    
    sendMessage(res, 'SCHEDULE_RETRIEVED', schedule);
  } catch (error) {
    console.error('Error al obtener horario:', error);
    sendMessage(res, 'SCHEDULE_FETCH_ERROR');
  }
};

// Crear un nuevo horario (solo admin)
export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dayOfWeek, startTime, endTime, maxCapacity, laneCount } = req.body;
    
    // Validar datos de entrada
    if (!dayOfWeek || !startTime || !endTime || !maxCapacity || !laneCount) {
      sendMessage(res, 'SCHEDULE_MISSING_REQUIRED_FIELDS');
      return;
    }
    
    // Crear el horario
    const newSchedule = await prisma.swimmingSchedule.create({
      data: {
        dayOfWeek: Number(dayOfWeek),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxCapacity: Number(maxCapacity),
        laneCount: Number(laneCount),
        isActive: true,
      },
    });
    
    sendMessage(res, 'SCHEDULE_CREATED', newSchedule);
  } catch (error) {
    console.error('Error al crear horario:', error);
    sendMessage(res, 'SCHEDULE_CREATE_ERROR');
  }
};

// Actualizar un horario (solo admin)
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime, maxCapacity, laneCount, isActive } = req.body;
    
    if (!id || isNaN(Number(id))) {
      sendMessage(res, 'SCHEDULE_INVALID_ID');
      return;
    }
    
    // Preparar datos para actualización
    const updateData: any = {};
    
    if (dayOfWeek !== undefined) updateData.dayOfWeek = Number(dayOfWeek);
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (maxCapacity !== undefined) updateData.maxCapacity = Number(maxCapacity);
    if (laneCount !== undefined) updateData.laneCount = Number(laneCount);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    
    // Actualizar el horario
    const updatedSchedule = await prisma.swimmingSchedule.update({
      where: { id: Number(id) },
      data: updateData,
    });
    
    sendMessage(res, 'SCHEDULE_UPDATED', updatedSchedule);
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    sendMessage(res, 'SCHEDULE_UPDATE_ERROR');
  }
};

// Eliminar un horario (solo admin)
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      sendMessage(res, 'SCHEDULE_INVALID_ID');
      return;
    }
    
    // Verificar si hay reservas asociadas
    const reservationsCount = await prisma.reservation.count({
      where: { scheduleId: Number(id) },
    });
    
    if (reservationsCount > 0) {
      // Si hay reservas, solo marcar como inactivo
      await prisma.swimmingSchedule.update({
        where: { id: Number(id) },
        data: { isActive: false },
      });
      
      sendMessage(res, 'SCHEDULE_DEACTIVATED');
      return;
    }
    
    // Si no hay reservas, eliminar completamente
    await prisma.swimmingSchedule.delete({
      where: { id: Number(id) },
    });
    
    sendMessage(res, 'SCHEDULE_DELETED');
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    sendMessage(res, 'SCHEDULE_DELETE_ERROR');
  }
};

// Verificar disponibilidad de un horario
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId, date } = req.query;
    
    if (!scheduleId || !date) {
      sendMessage(res, 'RESERVATION_MISSING_AVAILABILITY_DATA');
      return;
    }
    
    // Obtener el horario
    const schedule = await prisma.swimmingSchedule.findUnique({
      where: { id: Number(scheduleId) },
    });
    
    if (!schedule) {
      sendMessage(res, 'SCHEDULE_NOT_FOUND');
      return;
    }
    
    // Contar reservas existentes para ese horario y fecha
    const reservationsCount = await prisma.reservation.count({
      where: {
        scheduleId: Number(scheduleId),
        date: new Date(date as string),
        status: {
          not: 'CANCELLED',
        },
      },
    });
    
    // Calcular disponibilidad
    const availableSpots = Math.max(0, schedule.maxCapacity - reservationsCount);
    
    const availabilityData = {
      schedule,
      date,
      totalCapacity: schedule.maxCapacity,
      reservedSpots: reservationsCount,
      availableSpots,
      isFull: availableSpots === 0,
    };
    
    sendMessage(res, 'SCHEDULE_AVAILABILITY_CHECKED', availabilityData);
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    sendMessage(res, 'SCHEDULE_AVAILABILITY_ERROR');
  }
}; 