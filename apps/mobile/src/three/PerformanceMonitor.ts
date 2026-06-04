/**
 * Tracks frame timing to detect performance drops.
 * When FPS consistently falls below threshold, signals to reduce quality.
 */
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples = 60;
  private frameStart = 0;
  private _shouldReduceQuality = false;
  private checkInterval = 0;
  private readonly FPS_THRESHOLD = 25; // Below this, suggest reducing quality

  beginFrame(): void {
    this.frameStart = performance.now();
  }

  endFrame(): void {
    const elapsed = performance.now() - this.frameStart;
    this.frameTimes.push(elapsed);

    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    this.checkInterval++;
    if (this.checkInterval >= 30) {
      this.checkInterval = 0;
      this.evaluate();
    }
  }

  get shouldReduceQuality(): boolean {
    return this._shouldReduceQuality;
  }

  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avgMs =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return avgMs > 0 ? 1000 / avgMs : 60;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16;
    return (
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    );
  }

  private evaluate(): void {
    const fps = this.getAverageFPS();
    this._shouldReduceQuality = fps < this.FPS_THRESHOLD;
  }
}
