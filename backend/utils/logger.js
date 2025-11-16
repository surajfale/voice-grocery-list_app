const redact = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.startsWith('sk-') && value.length > 12) {
    return `${value.slice(0, 5)}***${value.slice(-4)}`;
  }

  return value;
};

const baseLog = (level, message, meta = {}) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  try {
    // Redact obvious secrets in shallow fields
    if (payload.apiKey) {
      payload.apiKey = redact(payload.apiKey);
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${message}`, meta);
  }
};

export const logger = {
  info(message, meta) {
    baseLog('info', message, meta);
  },
  warn(message, meta) {
    baseLog('warn', message, meta);
  },
  error(message, meta) {
    baseLog('error', message, meta);
  },
  debug(message, meta) {
    if (process.env.LOG_LEVEL === 'debug') {
      baseLog('debug', message, meta);
    }
  }
};

export default logger;


