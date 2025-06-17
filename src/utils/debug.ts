/**
 * Debug utilities for troubleshooting
 */

// Debug levels
export enum DebugLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

// Current debug level
let currentDebugLevel = DebugLevel.ERROR;

// Set debug level
export function setDebugLevel(level: DebugLevel): void {
  currentDebugLevel = level;
}

// Get current debug level
export function getDebugLevel(): DebugLevel {
  return currentDebugLevel;
}

// Log with level
export function log(level: DebugLevel, message: string, ...args: any[]): void {
  if (level <= currentDebugLevel) {
    switch (level) {
      case DebugLevel.ERROR:
        console.error(`[ERROR] ${message}`, ...args);
        break;
      case DebugLevel.WARN:
        console.warn(`[WARN] ${message}`, ...args);
        break;
      case DebugLevel.INFO:
        console.info(`[INFO] ${message}`, ...args);
        break;
      case DebugLevel.DEBUG:
        console.debug(`[DEBUG] ${message}`, ...args);
        break;
      case DebugLevel.TRACE:
        console.log(`[TRACE] ${message}`, ...args);
        break;
    }
  }
}

// Shorthand logging functions
export const logError = (message: string, ...args: any[]): void => log(DebugLevel.ERROR, message, ...args);
export const logWarn = (message: string, ...args: any[]): void => log(DebugLevel.WARN, message, ...args);
export const logInfo = (message: string, ...args: any[]): void => log(DebugLevel.INFO, message, ...args);
export const logDebug = (message: string, ...args: any[]): void => log(DebugLevel.DEBUG, message, ...args);
export const logTrace = (message: string, ...args: any[]): void => log(DebugLevel.TRACE, message, ...args);

// Enable debug mode
export function enableDebugMode(): void {
  setDebugLevel(DebugLevel.DEBUG);
  logInfo('Debug mode enabled');
}

// Enable trace mode
export function enableTraceMode(): void {
  setDebugLevel(DebugLevel.TRACE);
  logInfo('Trace mode enabled');
}

// Disable debug mode
export function disableDebugMode(): void {
  setDebugLevel(DebugLevel.ERROR);
  logInfo('Debug mode disabled');
}

// Get browser and environment information
export function getEnvironmentInfo(): Record<string, any> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    online: navigator.onLine,
    screenSize: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    timing: window.performance ? {
      navigationStart: window.performance.timing.navigationStart,
      loadEventEnd: window.performance.timing.loadEventEnd,
      loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart
    } : null
  };
}

// Log environment information
export function logEnvironmentInfo(): void {
  const info = getEnvironmentInfo();
  logInfo('Environment information:', info);
  return info;
}

// Create a debug session ID
export function createDebugSessionId(): string {
  return `debug-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Current debug session ID
let debugSessionId = createDebugSessionId();

// Get current debug session ID
export function getDebugSessionId(): string {
  return debugSessionId;
}

// Reset debug session ID
export function resetDebugSessionId(): string {
  debugSessionId = createDebugSessionId();
  return debugSessionId;
}

// Log with session ID
export function logWithSession(level: DebugLevel, message: string, ...args: any[]): void {
  log(level, `[${debugSessionId}] ${message}`, ...args);
}

// Create a debug context
export function createDebugContext(contextName: string) {
  return {
    error: (message: string, ...args: any[]) => log(DebugLevel.ERROR, `[${contextName}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => log(DebugLevel.WARN, `[${contextName}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => log(DebugLevel.INFO, `[${contextName}] ${message}`, ...args),
    debug: (message: string, ...args: any[]) => log(DebugLevel.DEBUG, `[${contextName}] ${message}`, ...args),
    trace: (message: string, ...args: any[]) => log(DebugLevel.TRACE, `[${contextName}] ${message}`, ...args),
  };
}

