const winston = require('winston');
const path = require('path');

// Define log levels and colors
const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const logColors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'white',
};

winston.addColors(logColors);

// Determine log directory
const logDir = process.env.LOG_DIR || 'logs';

// Create a base logger configuration
const createLogger = (level) => {
  const logger = winston.createLogger({
    level: level || 'info',
    levels: logLevels,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(
            (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
          )
        ),
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      }),
      // File transport for errors
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
      }),
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
    ],
    exitOnError: false,
  });

  return logger;
};

const logger = createLogger();

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => {
    logger.info(message.substring(0, message.lastIndexOf('\n')));
  },
};

module.exports = logger;
