import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendMessage } from '@/utils/responseHelper';

// Extiende la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: Role;
      };
    }
  }
}

// Extraer la clave secreta desde las variables de entorno
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key-for-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generar un token JWT
export const generateToken = (user: { id: number; email: string; role: Role }): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  
  // Evitamos usar SignOptions para expiresIn porque tiene conflictos de tipo
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
};

// Middleware para proteger rutas
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;

    // Verificar si el token está en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Si no hay token, devolver error
    if (!token) {
      sendMessage(res, 'AUTH_NOT_AUTHORIZED');
      return;
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: Role;
    };

    // Añadir el usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    sendMessage(res, 'AUTH_TOKEN_INVALID');
  }
};

// Middleware para restringir acceso basado en roles
export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendMessage(res, 'AUTH_NOT_AUTHENTICATED');
      return;
    }

    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      sendMessage(res, 'AUTH_INSUFFICIENT_PERMISSIONS');
    }
  };
}; 