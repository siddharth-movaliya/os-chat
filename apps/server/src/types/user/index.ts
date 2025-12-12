export type TUser = {
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  image: string | null;
};

export type TFriendRequestWithSender = {
  sender: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
  };
} & {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: Date;
  updatedAt: Date;
  senderId: string;
  receiverId: string;
};
