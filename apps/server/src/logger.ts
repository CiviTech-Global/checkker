import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? "silent" : isDev ? "debug" : "info"),
  transport: isDev && !isTest
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    service: "checkker",
    version: 1,
  },
});
