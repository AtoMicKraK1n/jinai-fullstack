import { Server } from "socket.io";
import { createServer } from "http";
import { setupSocketServer } from "./src/app/lib/websocket";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

setupSocketServer(io);

httpServer.listen(4000, () => {
  console.log("✅ WebSocket server running on port 4000");
});
