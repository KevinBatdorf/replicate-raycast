import { environment } from "@raycast/api";
import initSqlJs, { Database } from "sql.js";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DB_FILE_PATH } from "../constants";
import { isUrl, showAuthError, succeeded } from "../utils/helpers";
import { errorMessage, isAuthError, replicateFetch } from "./replicate";
import { PredictionResponse } from "../types";

export const createTables = `
CREATE TABLE Prediction (
    id TEXT NOT NULL PRIMARY KEY,
    src TEXT NOT NULL,
    url TEXT NOT NULL,
    prompt TEXT
);`;

export const initiDb = async () => {
  const SQL = await initSqlJs({
    locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm"),
  });
  const file = await readFile(DB_FILE_PATH);
  const db = new SQL.Database(file);
  try {
    db.exec("SELECT * FROM Prediction");
  } catch {
    db.run(createTables);
    const buffer = Buffer.from(db.export());
    writeFileSync(DB_FILE_PATH, buffer, "binary");
  }
  return db;
};

export const populateDbFromApi = async (db: Database, nextUrl: string | undefined) => {
  let data: PredictionResponse;
  try {
    data = await replicateFetch<PredictionResponse>(nextUrl ?? "/predictions");
  } catch (error) {
    if (isAuthError(error)) {
      await showAuthError(undefined, errorMessage(error));
      return false;
    }
    throw error;
  }

  let broke = false;

  const predictions = data.results.filter(succeeded).filter(isUrl);
  // Predictions come back newest first, so the first id we already have ends the crawl.
  for (const prediction of predictions) {
    const { id, urls, input, output } = prediction;

    const outputs = typeof output === "string" ? [output] : (output ?? []);
    for (const [index, src] of outputs.entries()) {
      const theId = `${id}-${index}`;
      const select = db.prepare(`SELECT * FROM Prediction WHERE id =:id`);
      const res = select.getAsObject({ ":id": theId });
      if (res?.id) {
        broke = true;
        break;
      }
      db.run("INSERT INTO Prediction (id, src, url, prompt) VALUES (?, ?, ?, ?)", [
        theId,
        src,
        urls?.get,
        input?.prompt ?? null,
      ]);
    }
  }
  if (data.next && !broke) {
    await populateDbFromApi(db, data.next);
  }
  return true;
};
