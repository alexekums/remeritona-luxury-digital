import { createServerFn } from "@tanstack/react-start";

export const testDb = createServerFn({ method: "GET" })
  .handler(async (ctx) => {
    const keys = Object.keys(globalThis).filter(k => k.toLowerCase().includes("remeritona") || k.toLowerCase().includes("d1") || k.toLowerCase().includes("db"));
    const symKeys = Object.getOwnPropertySymbols(globalThis).map(s => s.toString());
    const cfEnv = (globalThis as any)[Symbol.for("cloudflare:env")];
    return {
      matchingGlobalKeys: keys,
      symbolKeys: symKeys,
      cfEnvKeys: cfEnv ? Object.keys(cfEnv) : "cfEnv not found",
      processEnvKeys: Object.keys(process.env).filter(k => k.toLowerCase().includes("remeritona") || k.toLowerCase().includes("d1")),
    };
  });
