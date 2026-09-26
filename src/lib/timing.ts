import { environment } from "@raycast/api";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { Prediction } from "../types";

const seconds = (from?: string, to?: string) =>
  from && to ? (new Date(to).getTime() - new Date(from).getTime()) / 1000 : undefined;

export const startTimer = (label: string) => {
  const start = Date.now();
  const marks: Record<string, number> = {};
  return {
    mark: (name: string) => {
      marks[name] = (Date.now() - start) / 1000;
    },
    save: (prediction?: Prediction) =>
      appendFile(
        join(environment.supportPath, "timings.log"),
        `${JSON.stringify({
          label,
          at: new Date(start).toISOString(),
          ...marks,
          model: prediction?.model,
          queued: seconds(prediction?.created_at, prediction?.started_at),
          ran: prediction?.metrics?.predict_time,
          replicateTotal: seconds(prediction?.created_at, prediction?.completed_at),
        })}\n`,
      ).catch(() => undefined),
  };
};
