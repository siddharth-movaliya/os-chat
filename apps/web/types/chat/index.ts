export type TMessage = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
};

export type TChat = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  lastMessageTime?: Date;
  unread?: number;
  messages: TMessage[];
};
