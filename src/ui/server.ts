import { handleRequest } from "./routes"

const HOST = "127.0.0.1"
export const PORT = 7711

export function startServer() {
  return Bun.serve({
    hostname: HOST,
    port: PORT,
    fetch: handleRequest,
  })
}
