import { act, startTransition } from "react";

/**
 * Calls a `useOptimistic` setter inside a transition that never settles,
 * the way a pending server action would, so the optimistic state stays on
 * screen for the assertions that follow.
 */
export async function applyOptimistic<A>(setOptimistic: (a: A) => void, a: A) {
  await act(async () => {
    startTransition(async () => {
      setOptimistic(a);
      await new Promise(() => {});
    });
  });
}
