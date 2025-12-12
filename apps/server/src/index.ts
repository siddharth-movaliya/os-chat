import http from "http";
import SocketService from "./services/socket.js";
import KafkaService from "./services/kafka.js";
import MessageConsumer from "./services/messageConsumer.js";

async function init() {
  const socketService = new SocketService();
  const kafkaService = new KafkaService();
  const httpServer = http.createServer();
  const PORT = process.env.PORT ? process.env.PORT : 8000;

  // Initialize Kafka
  await socketService.initializeKafka();

  // Start Kafka consumer
  const consumer = await kafkaService.createConsumer("message-processor-group");
  const messageConsumer = new MessageConsumer(consumer);
  await messageConsumer.start();

  socketService.io.attach(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  socketService.initListeners();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...");
    await messageConsumer.stop();
    await socketService.shutdown();
    httpServer.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nShutting down gracefully...");
    await messageConsumer.stop();
    await socketService.shutdown();
    httpServer.close();
    process.exit(0);
  });
}

init().catch((error) => {
  console.error("Failed to initialize server:", error);
  process.exit(1);
});
