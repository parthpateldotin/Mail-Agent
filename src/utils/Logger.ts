export class Logger {
  private static logToConsole(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level}: ${message}`, ...args);
  }

  public static info(message: string, ...args: any[]) {
    this.logToConsole('INFO', message, ...args);
  }

  public static error(message: string, ...args: any[]) {
    this.logToConsole('ERROR', message, ...args);
  }

  public static warn(message: string, ...args: any[]) {
    this.logToConsole('WARN', message, ...args);
  }

  public static debug(message: string, ...args: any[]) {
    this.logToConsole('DEBUG', message, ...args);
  }
} 