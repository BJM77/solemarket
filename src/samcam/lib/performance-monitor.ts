export interface PerformanceMetrics {
  deviceName: string;
  captureTime: number;
  uploadTime: number;
  aiProcessingTime: number;
  totalTime: number;
  fps: number;
}

export function logPerformance(metrics: PerformanceMetrics) {
  // Log to analytics
  console.log(`[Performance] ${metrics.deviceName}:`, {
    capture: `${metrics.captureTime}ms`,
    upload: `${metrics.uploadTime}ms`,
    ai: `${metrics.aiProcessingTime}ms`,
    total: `${metrics.totalTime}ms`,
    fps: metrics.fps,
  });
  
  // Track in Firebase Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'samcam_performance', {
      device: metrics.deviceName,
      capture_time: metrics.captureTime,
      ai_time: metrics.aiProcessingTime,
      total_time: metrics.totalTime,
      fps: metrics.fps,
    });
  }
}
