import { useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { Prediction, PredictionResponse } from "../types";
import { replicateFetch } from "../lib/replicate";
import { POLL_INTERVAL_MS, isRunning } from "../utils/status";

const MAX_POLLED = 5;

export const usePredictions = () => {
  const result = usePromise(
    () =>
      async ({ cursor }: { cursor?: string }) => {
        const response = await replicateFetch<PredictionResponse>(cursor ?? "/predictions");
        return {
          data: response.results,
          hasMore: Boolean(response.next),
          cursor: response.next ?? undefined,
        };
      },
    [],
  );

  const { data, mutate } = result;
  const running = (data ?? []).filter(isRunning).slice(0, MAX_POLLED);
  const ids = running.map((prediction) => prediction.id).join(",");

  useEffect(() => {
    if (!ids) return;

    const timer = setTimeout(async () => {
      const updated = await Promise.all(ids.split(",").map((id) => replicateFetch<Prediction>(`/predictions/${id}`)));
      const byId = new Map(updated.map((prediction) => [prediction.id, prediction]));

      // Revalidating would refetch page one and drop everything the user scrolled to.
      await mutate(Promise.resolve(), {
        optimisticUpdate: (current: Prediction[] | undefined) =>
          (current ?? []).map((prediction) => byId.get(prediction.id) ?? prediction),
        shouldRevalidateAfter: false,
      });
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [ids, mutate]);

  return result;
};
