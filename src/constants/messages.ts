export const MESSAGES = {
  200: {
    AUTH_LOGIN: 'Inicio de sesión exitoso',
    AUTH_PROFILE_RETRIEVED: 'Perfil obtenido correctamente',
    AUTH_PROFILE_UPDATED: 'Perfil actualizado correctamente',
    APP_WELCOME: 'API de Reservas de Piscina',
    USER_LIST_RETRIEVED: 'Lista de usuarios obtenida correctamente',
    USER_RETRIEVED: 'Usuario obtenido correctamente',
  },

  201: {
    AUTH_REGISTER: 'Usuario registrado correctamente',
    RESERVATION_CREATED: 'Reserva creada correctamente',
    USER_CREATED: 'Usuario creado correctamente',
  },

  400: {
    AUTH_MISSING_CREDENTIALS: 'Por favor proporciona email y contraseña',
    AUTH_MISSING_REGISTER_DATA: 'Por favor proporciona email, contraseña y nombre',
    AUTH_EMAIL_ALREADY_EXISTS: 'Este email ya está registrado',
    AUTH_MISSING_CURRENT_PASSWORD: 'Debes proporcionar tu contraseña actual',
    USER_MISSING_REQUIRED_FIELDS: 'Email, contraseña y nombre son requeridos',
    USER_EMAIL_ALREADY_EXISTS: 'Este email ya está registrado',
    USER_INVALID_ID: 'ID de usuario inválido',
  },

  401: {
    AUTH_NOT_AUTHENTICATED: 'No estás autenticado',
    AUTH_NOT_AUTHORIZED: 'No estás autorizado para acceder a este recurso',
    AUTH_TOKEN_INVALID: 'Token inválido o expirado',
    AUTH_INVALID_CREDENTIALS: 'Credenciales inválidas',
    AUTH_ACCOUNT_DISABLED: 'Tu cuenta está desactivada. Por favor contacta al administrador.',
    AUTH_WRONG_CURRENT_PASSWORD: 'Contraseña actual incorrecta',
  },

  403: {
    AUTH_INSUFFICIENT_PERMISSIONS: 'No tienes permiso para realizar esta acción',
  },

  404: {
    AUTH_USER_NOT_FOUND: 'Usuario no encontrado',
    USER_NOT_FOUND: 'Usuario no encontrado',
  },

  500: {
    AUTH_REGISTER_ERROR: 'Error al registrar usuario',
    AUTH_LOGIN_ERROR: 'Error al iniciar sesión',
    AUTH_PROFILE_ERROR: 'Error al obtener información del perfil',
    AUTH_UPDATE_ERROR: 'Error al actualizar perfil',
    USER_FETCH_ERROR: 'Error al obtener usuarios',
    USER_CREATE_ERROR: 'Error al crear usuario',
  },
} as const;