// server.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketServer } from "./src/app/lib/websocket";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

setupSocketServer(io); // all logic handled in lib/websocket.ts

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`✅ WebSocket server running on port ${PORT}`);
});
