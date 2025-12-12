import { Prisma } from '@repo/prisma';

export type TFriendRequestWithSender = Prisma.FriendRequestGetPayload<{
  include: {
    sender: true;
  };
}>;
