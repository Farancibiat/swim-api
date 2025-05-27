import { Request, Response } from 'express';
import crypto from '@/utils/crypto';
import prisma from '@/config/db';
import { generateToken } from '@/config/auth';
import { sendMessage } from '@/utils/responseHelper';

// Registro de usuario
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    // Validar datos de entrada
    if (!email || !password || !name) {
      sendMessage(res, 'AUTH_MISSING_REGISTER_DATA');
      return;
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      sendMessage(res, 'AUTH_EMAIL_ALREADY_EXISTS');
      return;
    }

    // Hash de la contraseña
    const salt = await crypto.genSalt();
    const hashedPassword = await crypto.hash(password, salt);

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'USER',
      },
    });

    // Generar token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Responder excluyendo la contraseña
    const { password: _, ...userWithoutPassword } = newUser;
    
    sendMessage(res, 'AUTH_REGISTER', {
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Error en registro:', error);
    sendMessage(res, 'AUTH_REGISTER_ERROR');
  }
};

// Login de usuario
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validar datos de entrada
    if (!email || !password) {
      sendMessage(res, 'AUTH_MISSING_CREDENTIALS');
      return;
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      sendMessage(res, 'AUTH_INVALID_CREDENTIALS');
      return;
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      sendMessage(res, 'AUTH_ACCOUNT_DISABLED');
      return;
    }

    // Verificar contraseña
    const isPasswordValid = await crypto.compare(password, user.password);

    if (!isPasswordValid) {
      sendMessage(res, 'AUTH_INVALID_CREDENTIALS');
      return;
    }

    // Generar token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Responder excluyendo la contraseña
    const { password: _, ...userWithoutPassword } = user;
    
    sendMessage(res, 'AUTH_LOGIN', {
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Error en login:', error);
    sendMessage(res, 'AUTH_LOGIN_ERROR');
  }
};

// Obtener perfil del usuario actual
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendMessage(res, 'AUTH_NOT_AUTHENTICATED');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!user) {
      sendMessage(res, 'AUTH_USER_NOT_FOUND');
      return;
    }

    sendMessage(res, 'AUTH_PROFILE_RETRIEVED', user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    sendMessage(res, 'AUTH_PROFILE_ERROR');
  }
};

// Actualizar perfil del usuario
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendMessage(res, 'AUTH_NOT_AUTHENTICATED');
      return;
    }

    const { name, phone, currentPassword, newPassword } = req.body;

    // Preparar datos para actualización
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    // Si se intenta cambiar la contraseña, verificar la actual
    if (newPassword) {
      if (!currentPassword) {
        sendMessage(res, 'AUTH_MISSING_CURRENT_PASSWORD');
        return;
      }

      // Obtener usuario con contraseña
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        sendMessage(res, 'AUTH_USER_NOT_FOUND');
        return;
      }

      // Verificar contraseña actual
      const isPasswordValid = await crypto.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        sendMessage(res, 'AUTH_WRONG_CURRENT_PASSWORD');
        return;
      }

      // Hash de la nueva contraseña
      const salt = await crypto.genSalt();
      updateData.password = await crypto.hash(newPassword, salt);
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
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

    sendMessage(res, 'AUTH_PROFILE_UPDATED', updatedUser);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    sendMessage(res, 'AUTH_UPDATE_ERROR');
  }
}; 