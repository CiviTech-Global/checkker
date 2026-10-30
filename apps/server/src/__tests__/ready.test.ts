import type { Request, Response } from "express";
import { getDb } from "@checkker/database";
import { readyHandler } from "../routes/ready";

jest.mock("@checkker/database", () => ({
  getDb: jest.fn(),
}));

const mockedGetDb = getDb as jest.MockedFunction<typeof getDb>;

function createMockResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockReturnValue(res);

  return res as unknown as Response;
}

describe("readyHandler", () => {
  test("returns 200 when database is reachable", async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ "?column?": 1 }]);

    mockedGetDb.mockReturnValue({
      $queryRaw: queryRaw,
    } as unknown as ReturnType<typeof getDb>);

    const res = createMockResponse();

    await readyHandler({} as Request, res);

    expect(queryRaw).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: "ok" });
  });

  test("returns 503 when database is unreachable", async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error("Database unavailable"));

    mockedGetDb.mockReturnValue({
      $queryRaw: queryRaw,
    } as unknown as ReturnType<typeof getDb>);

    const res = createMockResponse();

    await readyHandler({} as Request, res);

    expect(queryRaw).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: "error" });
  });
});