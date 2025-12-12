'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { User } from '@repo/prisma/client';

// Function to get friends of the authenticated user
export async function getFriends(): Promise<User[]> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    // Extract friends from friendships
    const friends = friendships.map((friendship) => {
      return friendship.user1Id === userId
        ? friendship.user2
        : friendship.user1;
    });

    return friends;
  } catch (error) {
    throw new Error(`Failed to get friends: ${error}`);
  }
}
