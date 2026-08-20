import { Prediction, PredictionStatus } from "../types";

export const POLL_INTERVAL_MS = 2500;

export const TERMINAL_STATUSES: PredictionStatus[] = ["succeeded", "failed", "canceled"];

export const isRunning = (prediction: Pick<Prediction, "status">) => !TERMINAL_STATUSES.includes(prediction.status);
