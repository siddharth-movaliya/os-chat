'use client';

import { useState } from 'react';
import { ChatList } from '@/components/chat-list';
import { ChatArea } from '@/components/chat-area';
import { Chat } from '@/types/chat';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: '/diverse-woman-portrait.png',
    lastMessage: 'See you tomorrow!',
    timestamp: '2:34 PM',
    unread: 2,
    messages: [
      {
        id: '1',
        text: 'Hey! How are you?',
        timestamp: '2:30 PM',
        isSent: false,
      },
      {
        id: '2',
        text: "I'm good! How about you?",
        timestamp: '2:31 PM',
        isSent: true,
      },
      {
        id: '3',
        text: 'Great! Want to meet up tomorrow?',
        timestamp: '2:32 PM',
        isSent: false,
      },
      {
        id: '4',
        text: 'What time works for you?',
        timestamp: '2:33 PM',
        isSent: true,
      },
      {
        id: '5',
        text: 'See you tomorrow!',
        timestamp: '2:34 PM',
        isSent: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Mike Chen',
    avatar: '/man.jpg',
    lastMessage: 'Thanks for the help!',
    timestamp: '1:15 PM',
    messages: [
      {
        id: '1',
        text: 'Can you help me with the project?',
        timestamp: '1:10 PM',
        isSent: false,
      },
      {
        id: '2',
        text: 'Of course! What do you need?',
        timestamp: '1:12 PM',
        isSent: true,
      },
      {
        id: '3',
        text: 'Thanks for the help!',
        timestamp: '1:15 PM',
        isSent: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Emily KS',
    avatar: '/professional-woman.png',
    lastMessage: "Perfect, let's do it!",
    timestamp: 'Yesterday',
    messages: [
      {
        id: '1',
        text: 'Hey! Long time no see',
        timestamp: 'Yesterday',
        isSent: false,
      },
      {
        id: '2',
        text: 'I know! We should catch up',
        timestamp: 'Yesterday',
        isSent: true,
      },
      {
        id: '3',
        text: "Perfect, let's do it!",
        timestamp: 'Yesterday',
        isSent: false,
      },
    ],
  },
  {
    id: '4',
    name: 'Team Alpha',
    avatar: '/diverse-professional-team.png',
    lastMessage: 'Meeting at 3 PM',
    timestamp: 'Yesterday',
    messages: [
      {
        id: '1',
        text: "Don't forget about the meeting",
        timestamp: 'Yesterday',
        isSent: false,
      },
      {
        id: '2',
        text: 'Meeting at 3 PM',
        timestamp: 'Yesterday',
        isSent: false,
      },
    ],
  },
  {
    id: '5',
    name: 'Alex Turner',
    avatar: '/diverse-group.png',
    lastMessage: 'Sounds good!',
    timestamp: 'Monday',
    messages: [
      {
        id: '1',
        text: 'Want to grab coffee?',
        timestamp: 'Monday',
        isSent: true,
      },
      { id: '2', text: 'Sounds good!', timestamp: 'Monday', isSent: false },
    ],
  },
];

export default function Page() {
  const { data: session, isPending, error } = authClient.useSession();
  const [activeChat, setActiveChat] = useState<Chat>(mockChats[0]);
  const router = useRouter();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error || !session) {
    router.push('/login');
    return null;
  }

  return (
    <div className="bg-background flex h-screen">
      <ChatList
        chats={mockChats}
        activeChat={activeChat}
        onChatSelect={setActiveChat}
      />
      <ChatArea chat={activeChat} />
    </div>
  );
}
