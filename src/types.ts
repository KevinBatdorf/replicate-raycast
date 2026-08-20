export type PredictionResponse = {
  next: string | null;
  previous: string | null;
  results: Prediction[];
  detail?: string;
};

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export type Prediction = {
  id: string;
  model?: string;
  version?: string;
  urls?: {
    get?: string;
    cancel?: string;
  };
  input?: { prompt?: string } & Record<string, unknown>;
  status: PredictionStatus;
  output?: unknown;
  error?: string | null;
  logs?: string | null;
  created_at?: string;
  completed_at?: string;
  metrics?: {
    predict_time?: number;
  };
};
