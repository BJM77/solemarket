/**
 * @fileOverview Enterprise Health Monitoring for Benched.au.
 */

export interface SystemHealth {
  fps: number;
  memory: number;
  latency: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  uptime: number;
}

export class HealthMonitor {
  private metrics: any[] = [];
  private startTime = Date.now();

  record(fps: number, latency: number) {
    const memory = (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0;
    const entry = { timestamp: Date.now(), fps, memory, latency };
    this.metrics.push(entry);
    if (this.metrics.length > 100) this.metrics.shift();
  }

  getStatus(): SystemHealth {
    const recent = this.metrics.slice(-10);
    if (recent.length === 0) return { fps: 0, memory: 0, latency: 0, status: 'HEALTHY', uptime: 0 };

    const avgFps = recent.reduce((a, b) => a + b.fps, 0) / recent.length;
    const avgMemory = recent.reduce((a, b) => a + b.memory, 0) / recent.length;
    
    let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (avgFps < 20 || avgMemory > 800) status = 'CRITICAL';
    else if (avgFps < 45 || avgMemory > 500) status = 'DEGRADED';

    return {
      fps: Math.round(avgFps),
      memory: Math.round(avgMemory),
      latency: recent[recent.length-1].latency,
      status,
      uptime: Date.now() - this.startTime
    };
  }
}