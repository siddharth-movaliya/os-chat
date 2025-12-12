'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function searchUsersByName(query: string) {
  if (!query.trim()) {
    return [];
  }

  // Get current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        // Exclude the current user from results
        {
          id: {
            not: session.user.id,
          },
        },
      ],
    },
    include: {
      sentRequests: true,
      receivedRequests: true,
    },
  });

  return users;
}
