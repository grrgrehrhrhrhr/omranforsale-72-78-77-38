/**
 * نظام معالجة الأخطاء المحسن والموحد
 */

// أنواع الأخطاء المختلفة
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation', 
  PERMISSION = 'permission',
  STORAGE = 'storage',
  RENDER = 'render',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  code?: string;
  timestamp: Date;
  context?: any;
  stack?: string;
}

// تسجيل الأخطاء
class ErrorLogger {
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;

  log(error: ErrorInfo): void {
    this.errors.unshift(error);
    
    // الاحتفاظ بأحدث 100 خطأ فقط
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // طباعة الأخطاء المهمة فقط
    if (error.type === ErrorType.NETWORK || error.type === ErrorType.PERMISSION) {
      console.warn(`[${error.type}] ${error.message}`, error.context);
    }
  }

  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errors.slice(0, count);
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorStats(): { [key in ErrorType]: number } {
    const stats = Object.keys(ErrorType).reduce((acc, type) => {
      acc[type as ErrorType] = 0;
      return acc;
    }, {} as { [key in ErrorType]: number });

    this.errors.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }
}

export const errorLogger = new ErrorLogger();

// معالجات الأخطاء المختلفة
export const handleNetworkError = (error: any, context?: any): void => {
  errorLogger.log({
    type: ErrorType.NETWORK,
    message: error.message || 'فشل في الاتصال بالشبكة',
    timestamp: new Date(),
    context,
    stack: error.stack
  });
};

export const handleValidationError = (message: string, context?: any): void => {
  errorLogger.log({
    type: ErrorType.VALIDATION,
    message,
    timestamp: new Date(),
    context
  });
};

export const handlePermissionError = (message: string, context?: any): void => {
  errorLogger.log({
    type: ErrorType.PERMISSION,
    message,
    timestamp: new Date(),
    context
  });
};

export const handleStorageError = (error: any, context?: any): void => {
  errorLogger.log({
    type: ErrorType.STORAGE,
    message: error.message || 'فشل في عملية التخزين',
    timestamp: new Date(),
    context,
    stack: error.stack
  });
};

export const handleRenderError = (error: any, context?: any): void => {
  errorLogger.log({
    type: ErrorType.RENDER,
    message: error.message || 'خطأ في عرض المكون',
    timestamp: new Date(),
    context,
    stack: error.stack
  });
};

export const handleUnknownError = (error: any, context?: any): void => {
  errorLogger.log({
    type: ErrorType.UNKNOWN,
    message: error.message || 'خطأ غير معروف',
    timestamp: new Date(),
    context,
    stack: error.stack
  });
};

// معالج الأخطاء العام
export const handleError = (error: any, context?: any): void => {
  // تحديد نوع الخطأ تلقائياً
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    handleNetworkError(error, context);
  } else if (error.name === 'ValidationError') {
    handleValidationError(error.message, context);
  } else if (error.name === 'PermissionError' || error.status === 403) {
    handlePermissionError(error.message, context);
  } else if (error.name === 'QuotaExceededError' || error.code === 'STORAGE_ERROR') {
    handleStorageError(error, context);
  } else {
    handleUnknownError(error, context);
  }
};

// إعداد معالج الأخطاء العام للتطبيق
export const setupGlobalErrorHandler = (): void => {
  // معالجة أخطاء JavaScript غير المتوقعة
  window.addEventListener('error', (event) => {
    handleError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // معالجة أخطاء Promise غير المعالجة
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, {
      type: 'unhandled_promise_rejection'
    });
  });
};

// تصدير دالة للحصول على تقرير الأخطاء
export const getErrorReport = () => {
  return {
    recentErrors: errorLogger.getRecentErrors(),
    errorStats: errorLogger.getErrorStats(),
    timestamp: new Date().toISOString()
  };
};