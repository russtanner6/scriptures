import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // Load the WASM binary explicitly so sql.js doesn't try to
      // resolve it via a bundler-broken path
      // WASM file is committed to data/ so it's available on Vercel
      // (node_modules paths won't survive serverless bundling)
      const wasmPath = path.join(process.cwd(), "data", "sql-wasm.wasm");
      const wasmBuffer = fs.readFileSync(wasmPath);
      const wasmBinary = wasmBuffer.buffer.slice(
        wasmBuffer.byteOffset,
        wasmBuffer.byteOffset + wasmBuffer.byteLength
      ) as ArrayBuffer;

      const SQL = await initSqlJs({ wasmBinary });

      const dbPath = path.join(process.cwd(), "data", "scriptures.db");
      const dbBuffer = fs.readFileSync(dbPath);
      return new SQL.Database(dbBuffer);
    })();
  }
  return dbPromise;
}
