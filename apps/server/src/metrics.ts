type MetricName =
  | "games_started"
  | "games_completed"
  | "queue_waits"
  | "errors";

const counters: Record<MetricName, number> = {
  games_started: 0,
  games_completed: 0,
  queue_waits: 0,
  errors: 0,
};

export function incrementMetric(name: MetricName): void {
  counters[name] += 1;
}

export function getMetrics(): string {
  return [
    "# TYPE games_started counter",
    `games_started ${counters.games_started}`,
    "# TYPE games_completed counter",
    `games_completed ${counters.games_completed}`,
    "# TYPE queue_waits counter",
    `queue_waits ${counters.queue_waits}`,
    "# TYPE errors counter",
    `errors ${counters.errors}`,
    "",
  ].join("\n");
}