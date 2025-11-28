import { sqlite3Worker1Promiser } from "@sqlite.org/sqlite-wasm";

const log = console.log;
const error = console.error;

type SQLiteInitResult = {
  promiser: any;
  dbId: any;
};

let sqliteInitPromise: Promise<SQLiteInitResult> | null = null;

const initializeSQLite = async (): Promise<SQLiteInitResult> => {

  if (sqliteInitPromise) return sqliteInitPromise;

  sqliteInitPromise = (async () => {
    try {
      log("Loading and initializing SQLite3 module...");

      const promiser: any = await new Promise((resolve) => {
        const _promiser = sqlite3Worker1Promiser({
          onready: () => resolve(_promiser),
        });
      });

      log("Done initializing. Running demo...");

      const configResponse = await promiser("config-get", {});
      log("Running SQLite3 version", configResponse.result.version.libVersion);
      
      const openResponse = await promiser("open", {
        filename: "file:mydb.sqlite3?vfs=opfs",
      });
      const { dbId } = openResponse;
      log(
        "OPFS is available, created persisted database at",
        openResponse.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, "$1")
      );
      // Your SQLite code here.

      //     // Create a table if it does not exist
      //     // a field is id and auto-incremented, b field is a random number
      await promiser("exec", {
        dbId,
        sql: "CREATE TABLE IF NOT EXISTS t(a INTEGER PRIMARY KEY AUTOINCREMENT, b INTEGER)",
      });
      console.log("Creating a table...");

      return { promiser, dbId };
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error((err as any).result?.message || String(err));
      }
      error((err as Error).name, (err as Error).message);
      throw err;
    }
  })();
  
  return sqliteInitPromise;
};

/**
 * Export the SQLite database from OPFS as a Uint8Array
 */
const exportDatabase = async (): Promise<Uint8Array> => {
  const { promiser, dbId } = await initializeSQLite();
  
  const exportResponse = await promiser("export", {
    dbId,
  });
  
  return exportResponse.result.byteArray;
};

export { initializeSQLite, exportDatabase };
