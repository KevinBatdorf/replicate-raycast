import { environment, getPreferenceValues, openCommandPreferences, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import initSqlJs, { Database } from "sql.js";
import { existsSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { useEffect, useState } from "react";
import { createTables, initiDb, populateDbFromApi } from "../lib/db";
import { URL } from "node:url";
import { PredictionResponse } from "../types";
import { DB_FILE_PATH, PREDICTIONS_URL } from "../constants";
import { buildPaginatedUrl, filterIsUrl, succeeded } from "../lib/helpers";

if (!existsSync(DB_FILE_PATH)) {
  writeFileSync(DB_FILE_PATH, "", "utf8");
}
export const dumpDb = (db: Database) => {
  writeFileSync(DB_FILE_PATH, Buffer.from(db.export()));
};

export const useDatabase = () => {
  const [db, setDb] = useState<Database | null>();
  useEffect(() => {
    initiDb().then(async (client) => {
      await showToast(Toast.Style.Animated, "Indexing...");
      client.run("BEGIN TRANSACTION");
      await populateDbFromApi(client, undefined);
      client.run("COMMIT TRANSACTION");
      await showToast(Toast.Style.Success, "Indexed!");
      setDb(client);
    });
  }, []);

  useEffect(() => {
    if (!db) return;
    dumpDb(db);
    db.close();
    setDb(null);
  }, [db]);

  return db;
};
