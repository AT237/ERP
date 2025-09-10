// Global error tracking and debugging utilities

export interface ErrorReport {
  timestamp: string;
  type: 'javascript' | 'react' | 'api' | 'custom';
  message: string;
  stack?: string;
  context?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors = 50; // Keep last 50 errors

  init() {
    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        context: `${event.filename}:${event.lineno}:${event.colno}`,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'javascript',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: 'Unhandled Promise Rejection',
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    console.log('🔍 Error Tracking System Initialized');
  }

  captureError(errorData: Partial<ErrorReport>) {
    const error: ErrorReport = {
      timestamp: new Date().toISOString(),
      type: 'custom',
      message: 'Unknown error',
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...errorData
    };

    this.errors.push(error);
    
    // Keep only last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Enhanced console logging
    console.group(`🚨 ERROR CAPTURED [${error.type.toUpperCase()}]`);
    console.error('Message:', error.message);
    console.error('Context:', error.context);
    console.error('Timestamp:', error.timestamp);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.groupEnd();

    return error;
  }

  getRecentErrors(count = 10): ErrorReport[] {
    return this.errors.slice(-count);
  }

  clearErrors() {
    this.errors = [];
    console.log('🧹 Error log cleared');
  }

  exportErrorReport(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      totalErrors: this.errors.length,
      errors: this.errors
    }, null, 2);
  }

  // Debug helper for development
  debugInfo() {
    console.group('🔍 ERROR TRACKER DEBUG INFO');
    console.log('Total errors captured:', this.errors.length);
    console.log('Recent errors:', this.getRecentErrors(5));
    console.log('Browser info:', {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    console.groupEnd();
  }
}

export const errorTracker = new ErrorTracker();

// Initialize on import
if (typeof window !== 'undefined') {
  errorTracker.init();
}