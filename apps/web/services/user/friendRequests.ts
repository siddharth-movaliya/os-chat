'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { TFriendRequestWithSender } from '@/types/user/friendRequests';

// Function to get pending friend requests for the authenticated user
export async function getFriendRequests(): Promise<TFriendRequestWithSender[]> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const friendRequests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: true,
      },
    });
    return friendRequests;
  } catch (error) {
    throw new Error(`Failed to get friend requests: ${error}`);
  }
}

// Function to send a friend request from senderId to receiverId
export async function sendFriendRequest(
  senderId: string,
  receiverId: string
): Promise<TFriendRequestWithSender> {
  try {
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
      include: {
        sender: true,
      },
    });
    return friendRequest;
  } catch (error) {
    throw new Error(`Failed to send friend request: ${error}`);
  }
}

// Function to respond to a friend request (accept or reject)
export async function respondToFriendRequest(
  requestId: string,
  accept: boolean
): Promise<void> {
  try {
    const status = accept ? 'ACCEPTED' : 'DECLINED';
    const result = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status },
    });

    // If accepted, create a friendship
    // set user1Id and user2Id in a consistent order to avoid duplicates
    const userIds = [result.senderId, result.receiverId].sort();
    if (accept) {
      await prisma.friendship.create({
        data: {
          user1Id: userIds[0],
          user2Id: userIds[1],
        },
      });
    }
  } catch (error) {
    throw new Error(`Failed to respond to friend request: ${error}`);
  }
}
