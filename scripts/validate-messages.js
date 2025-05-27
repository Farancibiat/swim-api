#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para leer archivos recursivamente
function readFilesRecursively(dir, filePattern = /\.(ts|js)$/) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        traverse(fullPath);
      } else if (stat.isFile() && filePattern.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Función para extraer claves de mensajes del archivo de constantes
function extractMessageKeys() {
  const messagesPath = path.join(__dirname, '../src/constants/messages.ts');
  
  if (!fs.existsSync(messagesPath)) {
    log('red', '❌ No se encontró el archivo src/constants/messages.ts');
    process.exit(1);
  }
  
  const content = fs.readFileSync(messagesPath, 'utf8');
  const keys = [];
  const statusCodes = {};
  
  // Buscar bloques de status code
  const statusBlockRegex = /(\d{3}):\s*{([^}]+)}/g;
  let match;
  
  while ((match = statusBlockRegex.exec(content)) !== null) {
    const statusCode = match[1];
    const blockContent = match[2];
    
    // Extraer las claves dentro del bloque
    const keyRegex = /(\w+):/g;
    let keyMatch;
    const categoryKeys = [];
    
    while ((keyMatch = keyRegex.exec(blockContent)) !== null) {
      const category = keyMatch[1];
      keys.push(category);
      categoryKeys.push(category);
    }
    
    statusCodes[statusCode] = {
      total: categoryKeys.length,
      used: 0,
      categories: categoryKeys
    };
  }
  
  return { keys, statusCodes };
}

// Función para buscar uso de claves en archivos
function findMessageUsage() {
  const srcDir = path.join(__dirname, '../src');
  const files = readFilesRecursively(srcDir);
  const usage = new Map();
  
  // Excluir el archivo de mensajes de la búsqueda
  const messagesFile = path.join(srcDir, 'constants/messages.ts');
  const filesToCheck = files.filter(file => file !== messagesFile);
  
  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Buscar referencias a categorías de mensaje (nuevo formato)
    const categoryRegex = /['"`]([A-Z_]+)['"`]/g;
    let match;
    
    while ((match = categoryRegex.exec(content)) !== null) {
      const category = match[1];
      
      // Solo considerar categorías que parecen mensajes
      if (category.includes('_') && 
          (category.startsWith('AUTH_') || 
           category.startsWith('RESERVATION_') || 
           category.startsWith('SCHEDULE_') || 
           category.startsWith('USER_') || 
           category.startsWith('APP_'))) {
        
        if (!usage.has(category)) {
          usage.set(category, []);
        }
        
        usage.get(category).push(file.replace(srcDir, ''));
      }
    }
  }
  
  return usage;
}

// Función principal
function validateMessages() {
  log('blue', '🔍 Validando sistema de mensajes HTTP...\n');
  
  // Extraer claves definidas
  const { keys, statusCodes } = extractMessageKeys();
  log('green', `📝 Mensajes definidos: ${keys.length}`);
  
  // Buscar uso de claves
  const usage = findMessageUsage();
  log('green', `🔍 Categorías encontradas en código: ${usage.size}\n`);
  
  // Verificar qué categorías se están usando
  const usedCategories = Array.from(usage.keys());
  const unusedCategories = [];
  
  // Actualizar estadísticas por status code
  Object.keys(statusCodes).forEach(statusCode => {
    statusCodes[statusCode].categories.forEach(category => {
      if (usage.has(category)) {
        statusCodes[statusCode].used++;
      } else {
        unusedCategories.push(category);
      }
    });
  });
  
  // Mostrar categorías no utilizadas
  if (unusedCategories.length > 0) {
    log('yellow', '⚠️  Categorías no utilizadas:');
    unusedCategories.forEach(category => {
      log('yellow', `   - ${category}`);
    });
    console.log();
  }
  
  // Buscar categorías utilizadas pero no definidas
  const definedCategories = [];
  Object.values(statusCodes).forEach(status => {
    definedCategories.push(...status.categories);
  });
  
  const undefinedCategories = usedCategories.filter(category => 
    !definedCategories.includes(category)
  );
  
  if (undefinedCategories.length > 0) {
    log('red', '❌ Categorías no definidas:');
    undefinedCategories.forEach(category => {
      log('red', `   - ${category}`);
    });
    console.log();
  }
  
  // Estadísticas por status code
  log('blue', '📊 Estadísticas por código HTTP:');
  Object.entries(statusCodes).forEach(([statusCode, stats]) => {
    const percentage = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
    const color = percentage >= 80 ? 'green' : percentage >= 50 ? 'yellow' : 'red';
    const httpMeaning = getHttpStatusMeaning(statusCode);
    log(color, `   ${statusCode} (${httpMeaning}): ${stats.used}/${stats.total} (${percentage}%)`);
  });
  
  console.log();
  
  // Resumen final
  const totalDefined = Object.values(statusCodes).reduce((sum, status) => sum + status.total, 0);
  const totalUsed = Object.values(statusCodes).reduce((sum, status) => sum + status.used, 0);
  const totalUsagePercentage = totalDefined > 0 ? Math.round((totalUsed / totalDefined) * 100) : 0;
  
  if (undefinedCategories.length === 0) {
    log('green', '✅ Sistema HTTP completamente implementado!');
  } else {
    log('red', '❌ Hay errores en el sistema de mensajes');
    process.exit(1);
  }
}

// Helper para obtener el significado de los códigos HTTP
function getHttpStatusMeaning(statusCode) {
  const meanings = {
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error'
  };
  
  return meanings[statusCode] || 'Unknown';
}

// Ejecutar validación
if (require.main === module) {
  validateMessages();
}

module.exports = { validateMessages }; 