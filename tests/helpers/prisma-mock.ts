/**
 * A stand-in for `@/lib/prisma` that records every database call.
 *
 * Any `prisma.<model>.<method>(args)` resolves to a handler registered with
 * `on("<model>.<method>", fn)`, or to an empty default. Tests use `calls` both
 * to assert what was queried and to assert that nothing was queried at all.
 */

export type PrismaCall = { model: string; method: string; args: unknown[] };
type Handler = (...args: unknown[]) => unknown;

function emptyResult(method: string): unknown {
  switch (method) {
    case "findMany":
    case "groupBy":
      return [];
    case "count":
      return 0;
    case "aggregate":
      return { _sum: {}, _count: { _all: 0 } };
    case "findUnique":
    case "findFirst":
      return null;
    default:
      return {};
  }
}

function createPrismaMock() {
  const calls: PrismaCall[] = [];
  const handlers = new Map<string, Handler>();

  function invoke(model: string, method: string, args: unknown[]) {
    calls.push({ model, method, args });
    const handler = handlers.get(`${model}.${method}`);
    return Promise.resolve(handler ? handler(...args) : emptyResult(method));
  }

  const prisma = new Proxy(
    {},
    {
      get(_target, model) {
        if (typeof model !== "string" || model === "then") return undefined;
        if (model.startsWith("$")) {
          return (...args: unknown[]) => invoke(model, "call", args);
        }
        return new Proxy(
          {},
          {
            get(_t, method) {
              if (typeof method !== "string" || method === "then") return undefined;
              return (...args: unknown[]) => invoke(model, method, args);
            },
          }
        );
      },
    }
  );

  return {
    prisma,
    calls,
    on(key: string, handler: Handler) {
      handlers.set(key, handler);
    },
    reset() {
      calls.length = 0;
      handlers.clear();
    },
    callsTo(key: string) {
      return calls.filter((c) => `${c.model}.${c.method}` === key);
    },
  };
}

/** Singleton so `vi.mock` factories and test bodies share one instance. */
export const prismaMock = createPrismaMock();
