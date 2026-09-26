import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { Prediction, PredictionResponse } from "../types";
import { getPrediction, replicateFetch } from "../lib/replicate";
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

  // Kept apart from the paged data: mutating it cancels whichever page is still loading.
  const [live, setLive] = useState<Record<string, Prediction>>({});
  const predictions = (result.data ?? []).map((prediction) => live[prediction.id] ?? prediction);
  const ids = predictions
    .filter(isRunning)
    .slice(0, MAX_POLLED)
    .map((prediction) => prediction.id)
    .join(",");

  useEffect(() => {
    if (!ids) return;
    const timer = setTimeout(async () => {
      try {
        const updated = await Promise.all(ids.split(",").map(getPrediction));
        setLive((current) => ({ ...current, ...Object.fromEntries(updated.map((p) => [p.id, p])) }));
      } catch {
        // A failed poll leaves the last known status; the next one tries again.
        setLive((current) => ({ ...current }));
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [ids, live]);

  const revalidate = () => {
    setLive({});
    return result.revalidate();
  };

  return { ...result, data: result.data ? predictions : undefined, revalidate };
};
