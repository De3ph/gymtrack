import * as React from 'react';

/**
 * Simple performance monitoring utilities for tracking API calls and component render times
 */
export const PerformanceMetrics = {
  /** Track API request duration */
  trackApiCall: (name: string, durationMs: number) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Performance] ${name}: ${durationMs}ms`);
    }
    // Could integrate with Vercel Analytics or external monitoring
  },

  /** Track component render time */
  trackRenderTime: (componentName: string, durationMs: number) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Performance] Render ${componentName}: ${durationMs}ms`);
    }
  },

  /** Report performance budget violations */
  reportBudgetViolation: (budget: number, actual: number, threshold: number = 100) => {
    if (actual > budget + threshold) {
      console.warn(`[Performance Budget] ${budget}ms budget exceeded by ${actual - budget}ms`);
      // In real app: send to error tracking
    }
  }
};

/** Custom hook for measuring render performance */
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = React.useRef<number | null>(null);

  React.useEffect(() => {
    startTime.current = performance.now();
    return () => {
      if (startTime.current !== null) {
        const duration = performance.now() - startTime.current;
        PerformanceMetrics.trackRenderTime(componentName, duration);
      }
    };
  }, [componentName]);

  return { startTime };
};

/** Helper to wrap async functions with timing */
export const withTiming = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    PerformanceMetrics.trackApiCall(name, duration);
  });
};