/** Retire one runtime without reporting success before its storage is drained. */
export async function retireRuntime(
  runtime: { shutdown(reason: string): void; nethackModule: { __nh3dDrainPersistence?: () => Promise<void> } | null } | null,
  starting: Promise<void> | null,
): Promise<void> {
  if (starting) await starting;
  if (!runtime) return;
  runtime.shutdown("runtime bridge dispose");
  const drain = runtime.nethackModule?.__nh3dDrainPersistence;
  if (typeof drain !== "function") throw new Error("Persistence drain is unavailable");
  await drain();
}
