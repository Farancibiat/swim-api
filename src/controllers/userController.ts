import { Request, Response } from 'express';
import prisma from '@/config/db';
import { Role } from '@prisma/client';
import crypto from '@/utils/crypto';
import { sendMessage } from '@/utils/responseHelper';

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    sendMessage(res, 'USER_LIST_RETRIEVED', users);
  } catch (error) {
    console.error('Error fetching users:', error);
    sendMessage(res, 'USER_FETCH_ERROR');
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      sendMessage(res, 'USER_INVALID_ID');
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        reservations: true,
      },
    });
    
    if (!user) {
      sendMessage(res, 'USER_NOT_FOUND');
      return;
    }
    
    sendMessage(res, 'USER_RETRIEVED', user);
  } catch (error) {
    console.error('Error fetching user:', error);
    sendMessage(res, 'USER_FETCH_ERROR');
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, phone, role } = req.body;
    
    if (!email || !password || !name) {
      sendMessage(res, 'USER_MISSING_REQUIRED_FIELDS');
      return;
    }
    
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      sendMessage(res, 'USER_EMAIL_ALREADY_EXISTS');
      return;
    }
    
    // Hash de la contraseña
    const salt = await crypto.genSalt(10);
    const hashedPassword = await crypto.hash(password, salt);
    
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: role || Role.USER,
        isActive: true,
      },
    });
    
    // Excluir la contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = newUser;
    
    sendMessage(res, 'USER_CREATED', userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    sendMessage(res, 'USER_CREATE_ERROR');
  }
}; 