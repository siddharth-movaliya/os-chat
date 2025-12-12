import type { Consumer, EachMessagePayload } from "kafkajs";
import prisma from "../lib/prisma.js";

class MessageConsumer {
  private consumer: Consumer;
  private running: boolean = false;

  constructor(consumer: Consumer) {
    this.consumer = consumer;
  }

  async start(): Promise<void> {
    try {
      await this.consumer.subscribe({
        topic: "chat-messages",
        fromBeginning: false, // Only process new messages
      });

      this.running = true;

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      console.log("✓ Message consumer started");
    } catch (error) {
      console.error("Failed to start message consumer:", error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      const messageData = JSON.parse(message.value?.toString() || "{}");

      // Save to database
      await prisma.message.create({
        data: {
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          content: messageData.content,
          createdAt: new Date(messageData.timestamp),
          read: false,
        },
      });

      console.log(
        `✓ Message saved to DB [partition: ${partition}]`,
        messageData.senderId.slice(0, 8),
        "→",
        messageData.receiverId.slice(0, 8),
      );

      // Commit offset after successful processing
      await this.consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (BigInt(message.offset) + BigInt(1)).toString(),
        },
      ]);
    } catch (error) {
      console.error("Error processing message:", error);
      // Don't commit offset on error - message will be reprocessed
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.consumer.stop();
    console.log("✓ Message consumer stopped");
  }
}

export default MessageConsumer;
