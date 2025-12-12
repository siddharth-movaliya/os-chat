import { Redis } from "ioredis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { TFriendRequestWithSender, TUser } from "../types/user/index.js";
import KafkaService from "./kafka.js";
import dotenv from "dotenv";
dotenv.config();

const REDIS_URL: string = process.env.REDIS_URL || "redis://localhost:6379";
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);

class SocketService {
  private _io: Server;
  private kafkaService: KafkaService;
  private userPresence: Map<
    string,
    { socketId: string; status: "online" | "offline" }
  > = new Map();

  constructor() {
    console.log("Initializing SocketService");
    this._io = new Server({
      cors: {
        allowedHeaders: ["*"],
        origin: "*",
        credentials: true,
      },
    });

    // Integrate Redis adapter for scaling
    this._io.adapter(createAdapter(pub, sub));

    this.kafkaService = new KafkaService();

    console.log(process.env.NEXT_PUBLIC_BASE_URL);
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/jwks`),
    );

    // Socket auth middleware
    this._io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Unauthorized: No token provided"));
        }

        // Validate the BetterAuth JWT using JWKS
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: process.env.NEXT_PUBLIC_BASE_URL!,
          audience: process.env.NEXT_PUBLIC_BASE_URL!,
        });

        // Put authenticated user data into socket.data
        socket.data.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          image: payload.image,
        };

        next();
      } catch (err) {
        console.error("JWT validation failed:", err);
        next(new Error("Unauthorized"));
      }
    });
  }

  public async initializeKafka(): Promise<void> {
    await this.kafkaService.connect();
    await this.kafkaService.ensureTopicsExist();
  }

  public initListeners(): void {
    console.log("Setting up Socket.IO listeners");

    this._io.on("connect", async (socket) => {
      const user = socket.data.user;
      console.log(`User connected: ${user.id}`);

      try {
        // Clean up any stale socket IDs first
        const existingSockets = await pub.smembers(`user_sockets:${user.id}`);
        const connectedSockets = await this._io.in(user.id).fetchSockets();
        const connectedSocketIds = new Set(connectedSockets.map((s) => s.id));

        for (const socketId of existingSockets) {
          if (!connectedSocketIds.has(socketId)) {
            await pub.srem(`user_sockets:${user.id}`, socketId);
          }
        }

        // Add socket ID to user's set of sockets
        await pub.sadd(`user_sockets:${user.id}`, socket.id);

        // Set user online if this is their first socket
        const socketCount = await pub.scard(`user_sockets:${user.id}`);

        if (socketCount === 1) {
          await pub.hset("user_presence", user.id, "online");

          this._io.emit("user:presence_changed", {
            userId: user.id,
            status: "online",
            name: user.name,
          });
        }

        // Join a personal room
        socket.join(user.id);

        // Send current presence of all users to this socket
        const allPresence = await pub.hgetall("user_presence");

        for (const [userId, status] of Object.entries(allPresence)) {
          if (userId !== user.id) {
            socket.emit("user:presence_changed", {
              userId,
              status: status as "online" | "offline",
            });
          }
        }
      } catch (error) {
        console.error(`Error handling user connection for ${user.id}:`, error);
      }

      // Handle disconnect
      socket.on("disconnect", async () => {
        try {
          await pub.srem(`user_sockets:${user.id}`, socket.id);

          // Check if user still has other active sockets
          const remaining = await pub.scard(`user_sockets:${user.id}`);

          if (remaining === 0) {
            await pub.hset("user_presence", user.id, "offline");

            this._io.emit("user:presence_changed", {
              userId: user.id,
              status: "offline",
            });
          }

          console.log(`User disconnected: ${user.id}`);
        } catch (error) {
          console.error(
            `Error handling user disconnect for ${user.id}:`,
            error,
          );
        }
      });

      // Message handler - now publishes to Kafka instead of direct DB write
      socket.on(
        "message:send",
        async (
          { toUserId, message }: { toUserId: string; message: string },
          callback?: (response: { success: boolean; error?: string }) => void,
        ) => {
          try {
            const timestamp = Date.now();

            // Publish to Kafka
            await this.kafkaService.publishMessage({
              senderId: user.id,
              receiverId: toUserId,
              content: message,
              timestamp,
            });

            // Emit to recipient in real-time (if online)
            this._io.to(toUserId).emit("message:received", {
              fromUserId: user.id,
              message,
              timestamp,
            });

            if (callback) {
              callback({ success: true });
            }
          } catch (error) {
            console.error("Error handling message:", error);
            if (callback) {
              callback({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        },
      );

      // Chat handler (legacy support - remove if not used)
      socket.on("chat:send_dm", ({ toUserId, message }) => {
        this._io.to(toUserId).emit("chat:receive_dm", {
          fromUserId: user.id,
          message,
          timestamp: Date.now(),
        });
      });

      // Friend request handler
      socket.on(
        "friend_request:send",
        (
          {
            toUserId,
            friendRequest,
          }: {
            toUserId: string;
            friendRequest: TFriendRequestWithSender;
          },
          callback?: (response: { success: boolean; error?: string }) => void,
        ) => {
          try {
            this._io.to(toUserId).emit("friend_request:received", {
              friendRequest,
            });

            if (callback) {
              callback({ success: true });
            }
          } catch (error) {
            console.error("Error emitting friend request:", error);
            if (callback) {
              callback({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        },
      );

      // Friend request response handler
      socket.on(
        "friend_request:respond",
        (
          {
            toUser,
            requestId,
            accept,
          }: {
            toUser: TUser;
            requestId: string;
            accept: boolean;
          },
          callback?: (response: { success: boolean; error?: string }) => void,
        ) => {
          try {
            if (accept) {
              // Notify the user who sent the request
              this._io.to(toUser.id).emit("friendship:created", {
                userId: user.id,
                name: user.name,
                image: user.image,
              });

              // Notify the user who accepted the request
              this._io.to(user.id).emit("friendship:created", {
                userId: toUser.id,
                name: toUser.name,
                image: toUser.image,
              });
            }

            this._io.to(toUser.id).emit("friend_request:response_received", {
              requestId,
              accept,
            });

            if (callback) {
              callback({ success: true });
            }
          } catch (error) {
            console.error("Error emitting friend request response:", error);
            if (callback) {
              callback({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        },
      );
    });
  }

  get io(): Server {
    return this._io;
  }

  public getUserPresence(userId: string) {
    return this.userPresence.get(userId);
  }

  public async shutdown(): Promise<void> {
    await this.kafkaService.disconnect();
    this._io.close();
  }
}

export default SocketService;
