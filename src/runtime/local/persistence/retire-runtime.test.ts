import { describe, expect, it, vi } from "vitest";
import { retireRuntime } from "./retire-runtime";

describe("worker retirement", () => {
  it("waits for startup before shutdown and storage drain", async () => {
    let finishStart!: () => void;
    let finishDrain!: () => void;
    const starting = new Promise<void>(resolve => { finishStart = resolve; });
    const drain = vi.fn(() => new Promise<void>(resolve => { finishDrain = resolve; }));
    const shutdown = vi.fn();
    const retired = vi.fn();
    const promise = retireRuntime({ shutdown, nethackModule: { __nh3dDrainPersistence: drain } }, starting).then(retired);
    expect(shutdown).not.toHaveBeenCalled();
    finishStart();
    await Promise.resolve();
    expect(shutdown).toHaveBeenCalledOnce();
    expect(drain).toHaveBeenCalledOnce();
    expect(retired).not.toHaveBeenCalled();
    finishDrain();
    await promise;
    expect(retired).toHaveBeenCalledOnce();
  });

  it("does not report success if startup or the persistence drain failed", async () => {
    const shutdown = vi.fn();
    await expect(retireRuntime({ shutdown, nethackModule: null }, Promise.reject(new Error("startup failed")))).rejects.toThrow("startup failed");
    expect(shutdown).not.toHaveBeenCalled();
    await expect(retireRuntime({ shutdown, nethackModule: null }, null)).rejects.toThrow("drain is unavailable");
    await expect(retireRuntime({ shutdown, nethackModule: { __nh3dDrainPersistence: async () => { throw new Error("commit failed"); } } }, null)).rejects.toThrow("commit failed");
  });
});
