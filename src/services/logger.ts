import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: any;
}

const MAX_RING_BUFFER_SIZE = 250;
const logRingBuffer: LogEntry[] = [];
let isLoggingToFile = false;

function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data ? ` | ${typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] [${entry.level}] [${entry.tag}] ${entry.message}${dataStr}`;
}

/**
 * App-private crash log file path
 */
function getCrashLogFilePath(): string {
  const base = FileSystem.documentDirectory || '';
  return `${base}audioink_diagnostic.log`;
}

/**
 * Appends log entry asynchronously to the on-device log file
 */
async function appendLogToFile(entry: LogEntry): Promise<void> {
  if (Platform.OS === 'web' || isLoggingToFile) return;
  isLoggingToFile = true;
  try {
    const path = getCrashLogFilePath();
    const formatted = formatLogEntry(entry) + '\n';
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(path, formatted, { encoding: FileSystem.EncodingType.UTF8 });
    } else {
      // Keep file size bounded to ~500 KB to prevent unbounded disk growth
      if (info.size && info.size > 500 * 1024) {
        await FileSystem.writeAsStringAsync(path, formatted, { encoding: FileSystem.EncodingType.UTF8 });
      } else {
        const existing = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
        await FileSystem.writeAsStringAsync(path, existing + formatted, { encoding: FileSystem.EncodingType.UTF8 });
      }
    }
  } catch (err) {
    console.warn('[Logger] Failed to write log to file:', err);
  } finally {
    isLoggingToFile = false;
  }
}

function log(level: LogLevel, tag: string, message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    data,
  };

  // 1. Maintain in-memory ring buffer
  logRingBuffer.push(entry);
  if (logRingBuffer.length > MAX_RING_BUFFER_SIZE) {
    logRingBuffer.shift();
  }

  // 2. Output to console with native formatting
  const formatted = formatLogEntry(entry);
  switch (level) {
    case 'DEBUG':
      console.debug(formatted);
      break;
    case 'INFO':
      console.info(formatted);
      break;
    case 'WARN':
      console.warn(formatted);
      break;
    case 'ERROR':
    case 'FATAL':
      console.error(formatted);
      break;
  }

  // 3. For warnings, errors, and fatals, append to persistent file
  if (level === 'WARN' || level === 'ERROR' || level === 'FATAL') {
    void appendLogToFile(entry);
  }
}

export const logger = {
  debug: (tag: string, message: string, data?: any) => log('DEBUG', tag, message, data),
  info: (tag: string, message: string, data?: any) => log('INFO', tag, message, data),
  warn: (tag: string, message: string, data?: any) => log('WARN', tag, message, data),
  error: (tag: string, message: string, data?: any) => log('ERROR', tag, message, data),
  fatal: (tag: string, message: string, data?: any) => log('FATAL', tag, message, data),
};

/**
 * Returns in-memory ring buffer logs
 */
export function getRecentLogs(): LogEntry[] {
  return [...logRingBuffer];
}

/**
 * Returns formatted string of all recent logs
 */
export function getFormattedLogs(): string {
  return logRingBuffer.map(formatLogEntry).join('\n');
}

/**
 * Reads persistent crash log from filesystem
 */
export async function readPersistentLogFile(): Promise<string> {
  if (Platform.OS === 'web') {
    return getFormattedLogs();
  }
  try {
    const path = getCrashLogFilePath();
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      return await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
    }
  } catch (e) {
    console.warn('[Logger] Unable to read persistent log:', e);
  }
  return getFormattedLogs();
}

/**
 * Clears in-memory and persistent log files
 */
export async function clearAllLogs(): Promise<void> {
  logRingBuffer.length = 0;
  if (Platform.OS !== 'web') {
    try {
      const path = getCrashLogFilePath();
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (e) {
      console.warn('[Logger] Unable to clear persistent log:', e);
    }
  }
}

/**
 * Configures global uncaught JS error handlers
 */
export function initGlobalErrorLogging(): void {
  // 1. React Native ErrorUtils global handler
  const globalErrorUtils = (globalThis as any).ErrorUtils;
  if (globalErrorUtils && typeof globalErrorUtils.getGlobalHandler === 'function') {
    const defaultHandler = globalErrorUtils.getGlobalHandler();
    globalErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      logger.fatal('UncaughtGlobalError', error?.message || 'Unknown fatal error', {
        isFatal,
        name: error?.name,
        stack: error?.stack,
      });
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }

  // 2. Global Promise rejection handler
  if (typeof (globalThis as any).addEventListener === 'function') {
    (globalThis as any).addEventListener('unhandledrejection', (event: any) => {
      logger.error('UnhandledPromiseRejection', event?.reason?.message || String(event?.reason), {
        stack: event?.reason?.stack,
      });
    });
  }

  logger.info('Logger', 'Global error logging initialized successfully.');
}
