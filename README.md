# Scalable Distributed Chat Application

A production-ready, horizontally scalable chat application built as a distributed system. This project demonstrates key principles of distributed systems architecture including horizontal scalability, fault tolerance, and real-time data consistency across distributed components.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Getting Started](#getting-started)
- [User Guide](#user-guide)
- [Testing the Application](#testing-the-application)
- [Monitoring & Observability](#monitoring--observability)
- [Scaling the System](#scaling-the-system)
- [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

This project implements a scalable chat application designed as a distributed system that allows users connected to different servers to communicate seamlessly while each server independently handles its local users.

### Key Features

- **Distributed Architecture**: Multiple server instances can run simultaneously, each handling its own set of connected users
- **Real-time Communication**: Instant message delivery using Socket.IO with Redis pub/sub
- **Horizontal Scalability**: Easily add more server instances to handle increased load
- **Message Persistence**: Kafka ensures messages are never lost, with PostgreSQL for persistent storage
- **Fault Tolerance**: System continues operating even if individual components fail
- **High Throughput**: Kafka handles millions of messages per second with batching and compression
- **Friend System**: Add friends and manage friend requests
- **Authentication**: Secure authentication using Better-Auth

## 🏗️ Architecture Overview

The system consists of multiple layers working together to provide a seamless, scalable chat experience:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │         │   Client    │         │   Client    │
│  (Next.js)  │         │  (Next.js)  │         │  (Next.js)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Load Balancer     │
                    │    (Optional)       │
                    └──────────┬──────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
┌──────▼──────┐       ┌────────▼────────┐     ┌──────▼──────┐
│   Server 1  │◄─────►│   Server 2      │◄───►│   Server 3  │
│  (Node.js)  │       │   (Node.js)     │     │  (Node.js)  │
│ + Socket.IO │       │  + Socket.IO    │     │ + Socket.IO │
└──────┬──────┘       └────────┬────────┘     └──────┬──────┘
       │                       │                      │
       │              ┌────────▼────────┐             │
       │              │      Redis      │             │
       └─────────────►│   (Pub/Sub &    │◄────────────┘
                      │  Socket Adapter)│
                      └─────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
┌──────▼──────┐       ┌────────▼────────┐     ┌─────────────┐
│    Kafka    │◄─────►│  Kafka Consumer │────►│ PostgreSQL  │
│   (Broker)  │       │   Group         │     │  (Database) │
│  Topic:     │       │ message-        │     └─────────────┘
│ chat-msgs   │       │ processor-group │
└─────────────┘       └─────────────────┘
```

### Data Flow

1. **Message Sent**: Client sends a message via Socket.IO to any server instance
2. **Redis Pub/Sub**: Server publishes to Redis for real-time delivery to all connected clients
3. **Kafka Queue**: Server publishes message to Kafka topic for persistent storage
4. **Real-time Delivery**: All servers (via Redis adapter) receive the message and emit to relevant Socket.IO clients
5. **Async Processing**: Kafka consumers read messages and save to PostgreSQL at a controlled rate
6. **Persistence**: Message is stored in PostgreSQL for history and offline delivery

### Why This Architecture?

- **Redis**:
  - Enables Socket.IO adapter for multi-server communication
  - Provides pub/sub mechanism for real-time message broadcasting across server instances
  - Ensures all connected users receive messages regardless of which server they're connected to
- **Kafka**:
  - Decouples message delivery from database writes
  - Provides durability and fault tolerance (messages never lost)
  - Enables horizontal scaling by adding more consumers
  - Controls database write rate to prevent overload
- **PostgreSQL**:
  - Stores user data, friendships, and message history
  - Provides ACID guarantees for data consistency
- **Socket.IO**:
  - Real-time bidirectional communication
  - Automatic reconnection and fallback mechanisms
  - Room-based messaging for efficient delivery

## 🛠️ Technology Stack

### Frontend

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Socket.IO Client**: Real-time communication
- **Better-Auth**: Authentication library

### Backend

- **Node.js**: JavaScript runtime
- **TypeScript**: Type-safe development
- **Express**: Web framework
- **Socket.IO**: Real-time WebSocket server
- **Kafka**: Message broker for high-throughput messaging
- **Redis**: In-memory data store for pub/sub and caching
- **Prisma**: Type-safe ORM for PostgreSQL

### Infrastructure

- **PostgreSQL**: Primary database
- **Docker**: Containerization for local development
- **Turborepo**: Monorepo build system
- **pnpm**: Fast, disk-efficient package manager

## 💻 System Requirements

- **Node.js**: v18 or higher
- **pnpm**: v9.0.0 (will be installed automatically if not present)
- **Docker**: Latest version (for running PostgreSQL, Redis, Kafka, Zookeeper)
- **Docker Compose**: Included with Docker Desktop

## 🚀 Getting Started

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd os-chat
```

### Step 2: Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all project dependencies
pnpm install
```

This will install dependencies for all packages in the monorepo (web app, server, and shared packages).

### Step 3: Set Up Environment Variables

#### For the Web App (apps/web)

Create a `.env.local` file in `apps/web/`:

```env
# Database
DATABASE_URL=postgresql://oschat:oschat@localhost:5432/oschat_db

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here" # Generate a random string using `openssl rand -base64 32`
BETTER_AUTH_URL="http://localhost:3001"

# Socket URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000

# Google OAuth (generate your own at https://console.developers.google.com/)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

#### For the Server (apps/server)

Create a `.env` file in `apps/server/`:

```env
# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://oschat:oschat@localhost:5432/oschat_db

# Kafka
KAFKA_BROKER=localhost:9092

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Server Port
PORT=8000
```

### Step 4: Start the Application

From the root directory, run:

```bash
pnpm run dev
```

This single command will:

- Start Docker services (PostgreSQL, Redis, Kafka, Zookeeper, Kafka UI)
- Start the backend server on port 8000
- Start the web app on port 3000

You should see output indicating all services are starting. The server will show:

```
✓ Kafka producer connected
✓ Kafka topics created: [ 'chat-messages' ]
✓ Kafka consumer connected (group: message-processor-group)
✓ Message consumer started
✓ Redis connected
Server is running on http://localhost:8000
```

The web app will be available at <http://localhost:3000>

### Step 5: Run Database Migrations

Open a new terminal and run:

```bash
cd packages/prisma
pnpm prisma migrate dev
```

This will create all necessary tables in PostgreSQL.

### Optional: Open Prisma Studio

To view and edit your database visually, open another terminal:

```bash
cd packages/prisma
pnpm prisma studio
```

This opens a visual database browser

## 📖 User Guide

### Creating an Account

1. Navigate to http://localhost:3000
2. Click "Sign In"
3. Complete the registration with a google account

### Adding Friends

1. Click on the "Add Friend" button
2. Enter your friend's name
3. Send a friend request
4. Your friend will receive a notification
5. Once accepted, you can start chatting

### Sending Messages

1. Click on a friend from your friends list
2. Type your message in the input box
3. Press Enter or click Send
4. Messages are delivered in real-time
5. Message history is persisted and loaded on page refresh

### Testing Multi-Server Scalability

To see the distributed system in action:

1. Open two different browsers
2. Login with different users in each browser
3. Start multiple server instances (in different terminals):

   ```bash
   # Terminal 1 - Server 2
   cd apps/server
   export PORT=8001 NEXT_PUBLIC_BASE_URL=http://localhost:3001
   pnpm start

   # Terminal 2 - Client 2
   cd apps/web
   export NEXT_PUBLIC_SOCKET_URL=http://localhost:8001 BETTER_AUTH_URL=http://localhost:3001 NEXT_DIST_DIR=.next-2
   pnpm dev -p 3001
   ```

4. Messages will be delivered regardless of which server each user is connected to
5. Redis pub/sub ensures all servers receive messages
6. Kafka ensures messages are never lost

## 🧪 Testing the Application

### Manual Testing

1. **Real-time Delivery Test**:
   - Open two browser windows with different users
   - Send messages back and forth
   - Verify instant delivery

2. **Persistence Test**:
   - Send messages
   - Refresh the page
   - Verify message history is loaded

3. **Friend Request Test**:
   - Send friend requests between users
   - Accept/reject requests
   - Verify friend list updates

4. **Multi-Server Test**:
   - Start multiple server instances
   - Connect different users to different servers
   - Verify messages are delivered across servers

### Verifying Kafka Message Flow

1. Open Kafka UI at http://localhost:8080
2. Navigate to Topics → `chat-messages`
3. Send some messages in the app
4. Observe messages appearing in Kafka
5. Check the Messages tab to see message content
6. Monitor Consumer Groups to see processing

### Checking Database State

1. Open Prisma Studio
2. Browse the `Message` table to see stored messages
3. Check `User` table for registered users
4. View `Friendship` and `FriendRequest` tables

## 📊 Monitoring & Observability

### Kafka UI (http://localhost:8080)

- **Topics**: View message topics and their configuration
- **Messages**: Browse messages in topics
- **Consumer Groups**: Monitor consumer lag and processing status
- **Brokers**: Check Kafka broker health

### Prisma Studio

- Browse and edit database records
- View relationships between tables
- Quick database debugging

### Server Logs

The server provides detailed logging:

- Connection/disconnection events
- Message publishing to Kafka
- Message consumption and DB saves
- Errors and warnings

## 📈 Scaling the System

### Horizontal Scaling

Add more server instances to handle increased load.

All instances will:

- Share the same PostgreSQL database
- Use Redis for cross-server communication
- Participate in the same Kafka consumer group

### Increasing Kafka Throughput

Edit `apps/server/src/services/kafka.ts` to increase partitions:

```typescript
const requiredTopics = [
  {
    topic: "chat-messages",
    numPartitions: 6, // Increase from 3
    replicationFactor: 1,
  },
];
```

More partitions = more parallel processing = higher throughput

## 🐛 Troubleshooting

### Docker Services Won't Start

```bash
# Stop all services
cd packages/prisma
docker compose down

# Remove volumes (WARNING: deletes all data)
docker compose down -v

# Start fresh
docker compose up -d
```

### Cannot Connect to Database

1. Verify PostgreSQL is running: `docker compose ps`
2. Check `DATABASE_URL` in your `.env` files
3. Ensure the port (5432) is not in use by another process
4. Try restarting Docker services

### Kafka Consumer Not Receiving Messages

1. Check Kafka is running: `docker compose ps`
2. Verify topic exists in Kafka UI (http://localhost:8080)
3. Check server logs for connection errors
4. Restart the server: `pnpm dev`

### Real-time Messages Not Delivering

1. Verify Redis is running: `docker compose ps`
2. Check browser console for Socket.IO connection errors
3. Ensure `REDIS_URL` is correct in server `.env`
4. Check server logs for "Redis connected" message

### Port Already in Use

If you see "Port already in use" errors:

```bash
# Find process using the port (example for port 8000)
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)
```

### pnpm Command Not Found

```bash
# Install pnpm globally
npm install -g pnpm

# Or use npx
npx pnpm install
```

## 🏆 Key Distributed System Concepts Demonstrated

1. **Horizontal Scalability**: Add more servers without code changes
2. **Message Queue Pattern**: Kafka decouples producers and consumers
3. **Pub/Sub Pattern**: Redis enables real-time cross-server communication
4. **Event-Driven Architecture**: Messages flow through events
5. **Data Consistency**: Strong consistency via PostgreSQL, eventual consistency via Kafka
6. **Fault Tolerance**: System continues working if individual components fail
7. **Load Balancing**: Distribute connections across multiple servers
8. **Consumer Groups**: Multiple consumers share workload

## 📚 Project Structure

```
os-chat/
├── apps/
│   ├── server/          # Backend Node.js server
│   │   ├── src/
│   │   │   ├── index.ts           # Main entry point
│   │   │   ├── services/
│   │   │   │   ├── kafka.ts       # Kafka producer/consumer
│   │   │   │   ├── messageConsumer.ts  # Message processing
│   │   │   │   └── socket.ts      # Socket.IO handlers
│   │   │   └── lib/
│   │   │       └── prisma.ts      # Database client
│   │   └── package.json
│   └── web/             # Frontend Next.js app
│       ├── app/                   # Next.js app router
│       ├── components/            # React components
│       ├── context/               # React context providers
│       ├── services/              # API services
│       └── package.json
├── packages/
│   ├── prisma/          # Shared Prisma schema
│   │   ├── schema.prisma         # Database schema
│   │   ├── docker-compose.yml    # Docker services
│   │   └── migrations/           # Database migrations
│   ├── ui/              # Shared UI components
│   └── typescript-config/        # Shared TS configs
└── package.json         # Root package.json
```

## 🎓 Learning Resources

- **Kafka**: https://kafka.apache.org/documentation/
- **Redis Pub/Sub**: https://redis.io/topics/pubsub
- **Socket.IO**: https://socket.io/docs/
- **Prisma**: https://www.prisma.io/docs/
- **Next.js**: https://nextjs.org/docs
- **Distributed Systems**: "Designing Data-Intensive Applications" by Martin Kleppmann

## 📝 License

This project is for educational purposes.

---

**Built with ❤️ as a demonstration of distributed systems architecture**
