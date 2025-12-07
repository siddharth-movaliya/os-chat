export type Message = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
};

export type Chat = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
  messages: Message[];
};
