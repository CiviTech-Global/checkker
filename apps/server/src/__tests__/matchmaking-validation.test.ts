import {
  joinCasualDifficultySchema,
  joinCasualSchema,
  joinQueueSchema,
  joinRankedSchema,
  registerMatchmakingHandlers,
} from "../handlers/matchmaking";

/* ── Schema units ────────────────────────────────────────────────────── */

describe("matchmaking payload schemas", () => {
  it("accepts a well-formed join_queue payload", () => {
    const parsed = joinQueueSchema.safeParse({ rating: 1200, tc: "blitz" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual({ rating: 1200, tc: "blitz" });
  });

  it("accepts a well-formed join_casual payload", () => {
    expect(joinCasualSchema.safeParse({ tc: "rapid" }).success).toBe(true);
  });

  it("accepts a full join_ranked payload and tolerates omitted optionals", () => {
    const full = joinRankedSchema.safeParse({
      difficulty: "master",
      tc: "bullet",
      isBot: true,
      stake: "free",
    });
    expect(full.success).toBe(true);

    const minimal = joinRankedSchema.safeParse({ difficulty: "beginner", tc: "classical" });
    expect(minimal.success).toBe(true);
    if (minimal.success) {
      expect(minimal.data.tc).toBe("classical");
      expect(minimal.data.stake).toBeUndefined();
      expect(minimal.data.isBot).toBeUndefined();
    }
  });

  it("rejects an unknown time control", () => {
    for (const bad of ["blitz3", "thermonuclear", "", null, 5]) {
      expect(joinQueueSchema.safeParse({ rating: 1200, tc: bad }).success).toBe(false);
      expect(joinCasualSchema.safeParse({ tc: bad }).success).toBe(false);
    }
  });

  it("rejects an unknown bot difficulty or stake level", () => {
    expect(
      joinCasualDifficultySchema.safeParse({ difficulty: "grandmaster", tc: "blitz" }).success,
    ).toBe(false);
    expect(
      joinCasualDifficultySchema.safeParse({ difficulty: "advanced", tc: "blitz", stake: "gold" })
        .success,
    ).toBe(false);
    expect(
      joinCasualDifficultySchema.safeParse({ difficulty: "advanced", tc: "blitz", stake: "gold" })
        .error?.issues.some((i) => i.path.includes("stake")),
    ).toBe(true);
  });

  it("rejects a non-numeric or out-of-range rating", () => {
    for (const badRating of ["1200", -1, 1.5, 99999, undefined, null]) {
      const parsed = joinQueueSchema.safeParse({ rating: badRating, tc: "blitz" });
      expect(parsed.success).toBe(false);
      expect(parsed.error?.flatten().fieldErrors).toHaveProperty("rating");
    }
  });

  it("rejects non-object payloads", () => {
    expect(joinQueueSchema.safeParse("join me").success).toBe(false);
    expect(joinQueueSchema.safeParse(null).success).toBe(false);
    expect(joinQueueSchema.safeParse([1, 2]).success).toBe(false);
  });

  it("does not reject unknown extra keys (forward compatibility)", () => {
    expect(
      joinQueueSchema.safeParse({ rating: 1200, tc: "blitz", clientVersion: 2 }).success,
    ).toBe(true);
  });
});

/* ── Handler wiring (invalid payloads never reach the queue) ─────────── */

type CapturedEmit = { event: string; payload: unknown };

function mockSocket(id = "sock-1") {
  const handlers = new Map<string, (payload: unknown) => void>();
  const emits: CapturedEmit[] = [];
  const socket = {
    id,
    on: (event: string, fn: (payload: unknown) => void) => {
      handlers.set(event, fn);
    },
    emit: (event: string, payload: unknown) => {
      emits.push({ event, payload });
    },
  };
  return { socket, handlers, emits };
}

function mockServer() {
  return {
    addToQueue: jest.fn(),
    addToDifficultyQueue: jest.fn(),
  };
}

function callHandler(emits: CapturedEmit[], index = 0): { event: string; payload: never } {
  const emit = emits[index];
  if (!emit) throw new Error(`no emit #${index}`);
  return emit as { event: string; payload: never };
}

describe("registerMatchmakingHandlers — validation gate", () => {
  it("routes valid join_queue payloads to the queue", () => {
    const { socket, handlers, emits } = mockSocket();
    const server = mockServer();
    registerMatchmakingHandlers(socket as never, server as never);

    handlers.get("join_queue")!({ rating: 1500, tc: "rapid" });

    expect(emits).toHaveLength(0);
    expect(server.addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sock-1", rating: 1500, casual: false }),
      "rapid",
    );
  });

  it("rejects an invalid join_queue payload with a queue_error before queueing", () => {
    const { socket, handlers, emits } = mockSocket();
    const server = mockServer();
    registerMatchmakingHandlers(socket as never, server as never);

    handlers.get("join_queue")!({ rating: 1500, tc: "blitz3" });

    expect(server.addToQueue).not.toHaveBeenCalled();
    expect(emits).toHaveLength(1);
    const emit = callHandler(emits);
    expect(emit.event).toBe("queue_error");
    expect(emit.payload).toMatchObject({
      error: "invalid_payload",
      message: "Invalid join_queue payload",
    });
  });

  it("rejects a malformed join_casual payload and reports the offending field", () => {
    const { socket, handlers, emits } = mockSocket();
    const server = mockServer();
    registerMatchmakingHandlers(socket as never, server as never);

    handlers.get("join_casual")!({ tc: "thermonuclear" });

    expect(server.addToQueue).not.toHaveBeenCalled();
    const emit = callHandler(emits);
    expect(emit.event).toBe("queue_error");
    expect(callHandlerDetails(emit.payload)).toHaveProperty("tc");
  });

  it("rejects an unknown difficulty on join_ranked before any auth work", () => {
    const { socket, handlers, emits } = mockSocket();
    const server = mockServer();
    registerMatchmakingHandlers(socket as never, server as never);

    handlers.get("join_ranked")!({ difficulty: "impossible", tc: "blitz", isBot: true });

    expect(server.addToDifficultyQueue).not.toHaveBeenCalled();
    const emit = callHandler(emits);
    expect(emit.event).toBe("queue_error");
    expect((emit.payload as { error: string }).error).toBe("invalid_payload");
    expect(callHandlerDetails(emit.payload)).toHaveProperty("difficulty");
  });

  it("rejects non-object garbage on join_casual_difficulty", () => {
    const { socket, handlers, emits } = mockSocket();
    const server = mockServer();
    registerMatchmakingHandlers(socket as never, server as never);

    handlers.get("join_casual_difficulty")!("join me please");

    expect(server.addToDifficultyQueue).not.toHaveBeenCalled();
    const emit = callHandler(emits);
    expect(emit.event).toBe("queue_error");
    expect((emit.payload as { error: string }).error).toBe("invalid_payload");
  });
});

function callHandlerDetails(payload: unknown): Record<string, string[]> | undefined {
  const details = (payload as { details?: { fieldErrors?: Record<string, string[]> } })?.details;
  return details?.fieldErrors;
}
