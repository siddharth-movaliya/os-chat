import Redis from "ioredis";
import { Server } from "socket.io";

// const pub = new Redis();
// const sub = new Redis();

class SocketService {
  private _io: Server;
  constructor() {
    console.log("Initializing SocketService");
    this._io = new Server({
      cors: {
        allowedHeaders: ["*"],
        origin: "*",
      },
    });
  }

  public initListeners(): void {
    console.log("Setting up Socket.IO listeners");

    this._io.on("connect", (socket) => {
      console.log(`New client connected: ${socket.id}`);

      socket.on("event:message", async (msg) => {
        console.log(`Received message from ${socket.id}: ${msg}`);

        // Publish the message to redis
      });
    });
  }

  get io(): Server {
    return this._io;
  }
}

export default SocketService;
