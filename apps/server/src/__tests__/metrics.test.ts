import { getMetrics, incrementMetric } from "../metrics";

describe("metrics", () => {
  test("returns valid Prometheus counter text", () => {
    incrementMetric("games_started");
    incrementMetric("games_completed");
    incrementMetric("queue_waits");
    incrementMetric("errors");

    const metrics = getMetrics();

    expect(metrics).toContain("# TYPE games_started counter");
    expect(metrics).toMatch(/games_started \d+/);

    expect(metrics).toContain("# TYPE games_completed counter");
    expect(metrics).toMatch(/games_completed \d+/);

    expect(metrics).toContain("# TYPE queue_waits counter");
    expect(metrics).toMatch(/queue_waits \d+/);

    expect(metrics).toContain("# TYPE errors counter");
    expect(metrics).toMatch(/errors \d+/);
  });
});