import crypto from 'crypto';

/**
 * Configuración para el hash de contraseñas
 */
const HASH_CONFIG = {
  iterations: 100000, // Número de iteraciones (equivalente a cost 10 de bcrypt)
  keyLength: 64, // Longitud de la clave en bytes
  digest: 'sha512' as const // Algoritmo de hash
};

/**
 * Genera un hash de contraseña usando PBKDF2
 * @param password Contraseña en texto plano
 * @param salt Salt opcional (se genera automáticamente si no se proporciona)
 * @returns Hash de la contraseña en formato: iterations$keyLength$salt$hash
 */
export const hashPassword = async (password: string, salt?: string): Promise<string> => {
  // Generar salt si no se proporciona
  const passwordSalt = salt || crypto.randomBytes(32).toString('hex');
  
  // Crear el hash usando PBKDF2
  const hash = crypto.pbkdf2Sync(
    password,
    passwordSalt,
    HASH_CONFIG.iterations,
    HASH_CONFIG.keyLength,
    HASH_CONFIG.digest
  ).toString('hex');
  
  // Retornar en formato: iterations$keyLength$salt$hash
  return `${HASH_CONFIG.iterations}$${HASH_CONFIG.keyLength}$${passwordSalt}$${hash}`;
};

/**
 * Verifica una contraseña contra su hash
 * @param password Contraseña en texto plano
 * @param hashedPassword Hash almacenado
 * @returns true si la contraseña es correcta, false si no
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    // Extraer los componentes del hash
    const parts = hashedPassword.split('$');
    
    if (parts.length !== 4) {
      throw new Error('Formato de hash inválido');
    }
    
    const [iterationsStr, keyLengthStr, salt, originalHash] = parts;
    
    // Validar que todos los componentes existen
    if (!iterationsStr || !keyLengthStr || !salt || !originalHash) {
      throw new Error('Componentes del hash faltantes');
    }
    
    const iterations = parseInt(iterationsStr, 10);
    const keyLength = parseInt(keyLengthStr, 10);
    
    // Validar que los números son válidos
    if (isNaN(iterations) || isNaN(keyLength)) {
      throw new Error('Parámetros numéricos inválidos en el hash');
    }
    
    // Recrear el hash con la misma configuración
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      keyLength,
      HASH_CONFIG.digest
    ).toString('hex');
    
    // Comparación segura usando timingSafeEqual
    return crypto.timingSafeEqual(
      Buffer.from(originalHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch (error) {
    console.error('Error al comparar contraseñas:', error);
    return false;
  }
};

/**
 * Genera un salt aleatorio (mantener compatibilidad con la API de bcryptjs)
 * @param rounds Número de rounds (se ignora, solo por compatibilidad)
 * @returns Salt generado
 */
export const genSalt = async (): Promise<string> => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Alias para hashPassword para mantener compatibilidad con bcryptjs
 * @param password Contraseña a hashear
 * @param saltOrRounds Salt o número de rounds
 * @returns Hash de la contraseña
 */
export const hash = async (password: string, saltOrRounds: string | number): Promise<string> => {
  if (typeof saltOrRounds === 'string') {
    return hashPassword(password, saltOrRounds);
  }
  // Si es un número (rounds), generar salt y hashear
  return hashPassword(password);
};

/**
 * Alias para comparePassword para mantener compatibilidad con bcryptjs
 */
export const compare = comparePassword;

// Exportar como default un objeto con todas las funciones
const cryptoUtils = {
  hashPassword,
  comparePassword,
  genSalt,
  hash,
  compare
};

export default cryptoUtils; 