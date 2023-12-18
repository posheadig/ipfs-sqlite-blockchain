import { createDbWorker } from "sql.js-httpvfs";

const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url
);
const wasmUrl = new URL("sql.js-httpvfs/dist/sql-wasm.wasm", import.meta.url);

export async function initDbWorker() {
  return createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: "https://cloudflare-ipfs.com/ipfs/bafybeieluiest3gtccszqh6bymzs6r4gn62wsh2uznom2pqb2tqt54ef7i/sepolia.db",
          requestChunkSize: 4096,
        },
      },
    ],
    workerUrl.toString(),
    wasmUrl.toString()
  );
}
