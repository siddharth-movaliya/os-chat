import { Kafka, Partitioners } from "kafkajs";
import type { Producer, Consumer, Admin } from "kafkajs";

class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer | null = null;
  private admin: Admin;

  constructor() {
    this.kafka = new Kafka({
      clientId: "oschat-server",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
      createPartitioner: Partitioners.DefaultPartitioner,
    });

    this.admin = this.kafka.admin();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log("✓ Kafka producer connected");
    } catch (error) {
      console.error("✗ Failed to connect Kafka producer:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      await this.admin.disconnect();
      console.log("✓ Kafka disconnected");
    } catch (error) {
      console.error("✗ Failed to disconnect Kafka:", error);
    }
  }

  async publishMessage(message: {
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: number;
  }): Promise<void> {
    try {
      await this.producer.send({
        topic: "chat-messages",
        messages: [
          {
            key: message.receiverId, // Partition by receiver for ordering
            value: JSON.stringify(message),
            timestamp: message.timestamp.toString(),
          },
        ],
      });
    } catch (error) {
      console.error("Failed to publish message to Kafka:", error);
      throw error;
    }
  }

  async createConsumer(groupId: string): Promise<Consumer> {
    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await this.consumer.connect();
    console.log(`✓ Kafka consumer connected (group: ${groupId})`);

    return this.consumer;
  }

  async ensureTopicsExist(): Promise<void> {
    try {
      await this.admin.connect();

      const topics = await this.admin.listTopics();

      const requiredTopics = [
        {
          topic: "chat-messages",
          numPartitions: 3,
          replicationFactor: 1,
        },
      ];

      const topicsToCreate = requiredTopics.filter(
        (t) => !topics.includes(t.topic)
      );

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate,
        });
        console.log(
          "✓ Kafka topics created:",
          topicsToCreate.map((t) => t.topic)
        );
      }

      await this.admin.disconnect();
    } catch (error) {
      console.error("Failed to ensure Kafka topics:", error);
    }
  }
}

export default KafkaService;
