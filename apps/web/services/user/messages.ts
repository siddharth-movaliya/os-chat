'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Message } from '@repo/prisma/client';

// Function to get messages between two users
export async function getMessages(otherUserId: string): Promise<Message[]> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  } catch (error) {
    throw new Error(`Failed to get messages: ${error}`);
  }
}

// Function to mark messages as read
export async function markMessagesAsRead(fromUserId: string): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    await prisma.message.updateMany({
      where: {
        senderId: fromUserId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  } catch (error) {
    throw new Error(`Failed to mark messages as read: ${error}`);
  }
}

// Function to get unread message count for each friend
export async function getUnreadCounts(): Promise<Record<string, number>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const unreadMessages = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        receiverId: userId,
        read: false,
      },
      _count: {
        id: true,
      },
    });

    const unreadCounts: Record<string, number> = {};
    unreadMessages.forEach((item) => {
      unreadCounts[item.senderId] = item._count.id;
    });

    return unreadCounts;
  } catch (error) {
    throw new Error(`Failed to get unread counts: ${error}`);
  }
}

// Function to get last message with each friend
export async function getLastMessages(): Promise<
  Record<string, { content: string; timestamp: Date }>
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['senderId', 'receiverId'],
    });

    // Group by the other user
    const lastMessages: Record<string, { content: string; timestamp: Date }> =
      {};

    messages.forEach((msg) => {
      const otherUserId =
        msg.senderId === userId ? msg.receiverId : msg.senderId;

      // Only keep the most recent message for each user
      if (
        !lastMessages[otherUserId] ||
        msg.createdAt > lastMessages[otherUserId].timestamp
      ) {
        lastMessages[otherUserId] = {
          content: msg.content,
          timestamp: msg.createdAt,
        };
      }
    });

    return lastMessages;
  } catch (error) {
    throw new Error(`Failed to get last messages: ${error}`);
  }
}
