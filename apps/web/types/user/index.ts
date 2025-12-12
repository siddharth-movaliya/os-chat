import { Prisma } from '@repo/prisma/client';

export type TUserWithFriendRequests = Prisma.UserGetPayload<{
  include: {
    receivedRequests: true;
    sentRequests: true;
  };
}>;

export type TUserWithFriendships = Prisma.UserGetPayload<{
  include: {
    friendships1: true;
    friendships2: true;
  };
}>;
