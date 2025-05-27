import { Request, Response } from 'express';
import prisma from '@/config/db';

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

    res.json(schedules);
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ error: 'Error al obtener horarios de natación' });
  }
};

// Obtener un horario por ID
export const getScheduleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const schedule = await prisma.swimmingSchedule.findUnique({
      where: { id: Number(id) },
    });
    
    if (!schedule) {
      res.status(404).json({ error: 'Horario no encontrado' });
      return;
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error al obtener horario:', error);
    res.status(500).json({ error: 'Error al obtener horario de natación' });
  }
};

// Crear un nuevo horario (solo admin)
export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dayOfWeek, startTime, endTime, maxCapacity, laneCount } = req.body;
    
    // Validar datos de entrada
    if (!dayOfWeek || !startTime || !endTime || !maxCapacity || !laneCount) {
      res.status(400).json({ 
        error: 'Por favor proporciona todos los campos requeridos: día de la semana, hora de inicio, hora de fin, capacidad máxima y número de carriles' 
      });
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
    
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error al crear horario:', error);
    res.status(500).json({ error: 'Error al crear horario de natación' });
  }
};

// Actualizar un horario (solo admin)
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime, maxCapacity, laneCount, isActive } = req.body;
    
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
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({ error: 'Error al actualizar horario de natación' });
  }
};

// Eliminar un horario (solo admin)
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
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
      
      res.json({ message: 'Horario desactivado correctamente. No se eliminó completamente debido a que tiene reservas asociadas.' });
      return;
    }
    
    // Si no hay reservas, eliminar completamente
    await prisma.swimmingSchedule.delete({
      where: { id: Number(id) },
    });
    
    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ error: 'Error al eliminar horario de natación' });
  }
};

// Verificar disponibilidad de un horario
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId, date } = req.query;
    
    if (!scheduleId || !date) {
      res.status(400).json({ error: 'Por favor proporciona el ID del horario y la fecha' });
      return;
    }
    
    // Obtener el horario
    const schedule = await prisma.swimmingSchedule.findUnique({
      where: { id: Number(scheduleId) },
    });
    
    if (!schedule) {
      res.status(404).json({ error: 'Horario no encontrado' });
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
    
    res.json({
      schedule,
      date,
      totalCapacity: schedule.maxCapacity,
      reservedSpots: reservationsCount,
      availableSpots,
      isFull: availableSpots === 0,
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({ error: 'Error al verificar disponibilidad del horario' });
  }
}; 