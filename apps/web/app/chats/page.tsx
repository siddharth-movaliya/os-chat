'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatList } from '@/components/chat-list';
import { ChatArea } from '@/components/chat-area';
import { TChat, TMessage } from '@/types/chat';
import { getFriends } from '@/services/user/friendships';
import {
  getMessages,
  markMessagesAsRead,
  getUnreadCounts,
  getLastMessages,
} from '@/services/user/messages';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketProvider';

export default function Page() {
  const { data: session, isPending } = authClient.useSession();
  const [chats, setChats] = useState<TChat[]>([]);
  const [messagesMap, setMessagesMap] = useState<Map<string, TMessage[]>>(
    new Map()
  );
  const [activeChatId, setActiveChatId] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const activeChatIdRef = useRef<string | undefined>(undefined);
  const loadedChatsRef = useRef<Set<string>>(new Set());
  const {
    onFriendshipCreated,
    offFriendshipCreated,
    onMessageReceived,
    offMessageReceived,
  } = useSocket();
  const router = useRouter();

  // Derive activeChat from chats array with messages from messagesMap
  const activeChat = activeChatId
    ? ({
        ...chats.find((chat) => chat.id === activeChatId),
        messages: messagesMap.get(activeChatId) || [],
      } as TChat | undefined)
    : undefined;

  // Keep ref in sync with activeChatId
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Handle message sent from ChatArea - no DB write needed, Kafka handles it
  const handleMessageSent = async (
    chatId: string,
    message: string,
    timestamp: number
  ) => {
    const newMessage = {
      id: `${session?.user?.id}-${timestamp}`,
      text: message,
      timestamp: new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isSent: true,
    };

    // Update messages in separate map
    setMessagesMap((prev) => {
      const newMap = new Map(prev);
      const currentMessages = newMap.get(chatId) || [];
      newMap.set(chatId, [...currentMessages, newMessage]);
      return newMap;
    });

    // Update chat metadata
    setChats((prevChats) => {
      return prevChats
        .map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessage: message,
              timestamp: new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              lastMessageTime: new Date(timestamp),
            };
          }
          return chat;
        })
        .sort((a, b) => {
          // Sort by last message time, most recent first
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });
    });
  };

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.push('/');
      return;
    }

    const fetchFriends = async () => {
      try {
        const [friends, unreadCounts, lastMessages] = await Promise.all([
          getFriends(),
          getUnreadCounts(),
          getLastMessages(),
        ]);

        const friendChats: TChat[] = friends.map((friend) => {
          const lastMsg = lastMessages[friend.id];
          return {
            id: friend.id,
            name: friend.name,
            avatar: friend.image || '/placeholder.svg',
            lastMessage: lastMsg?.content || 'No messages yet',
            timestamp: lastMsg?.timestamp
              ? new Date(lastMsg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
            lastMessageTime: lastMsg?.timestamp,
            unread: unreadCounts[friend.id] || 0,
            messages: [],
          };
        });

        // Sort by last message time, most recent first
        friendChats.sort((a, b) => {
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });

        setChats(friendChats);
        if (friendChats.length > 0) {
          setActiveChatId(friendChats[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();

    // Listen for new friends being added
    const handleFriendshipCreated = (data: {
      userId: string;
      name: string;
      image: string;
    }) => {
      setChats((prevChats) => {
        // Avoid adding duplicate chats
        if (prevChats.find((chat) => chat.id === data.userId)) {
          return prevChats;
        }
        const newChat: TChat = {
          id: data.userId,
          name: data.name,
          avatar: data.image || '/placeholder.svg',
          lastMessage: 'No messages yet',
          timestamp: '',
          unread: 0,
          messages: [],
        };
        return [newChat, ...prevChats];
      });
      // Set as active chat if no active chat exists
      if (!activeChatIdRef.current) {
        setActiveChatId(data.userId);
      }
    };

    onFriendshipCreated(handleFriendshipCreated);

    // Listen for incoming messages
    const handleMessageReceived = (data: {
      fromUserId: string;
      message: string;
      timestamp: number;
    }) => {
      const newMessage = {
        id: `${data.fromUserId}-${data.timestamp}`,
        text: data.message,
        timestamp: new Date(data.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isSent: false,
      };

      // Check if this is the active chat using ref
      const isActiveChat = activeChatIdRef.current === data.fromUserId;

      // Update messages in separate map
      setMessagesMap((prev) => {
        const newMap = new Map(prev);
        const currentMessages = newMap.get(data.fromUserId) || [];
        newMap.set(data.fromUserId, [...currentMessages, newMessage]);
        return newMap;
      });

      // Update chat metadata
      setChats((prevChats) => {
        return prevChats
          .map((chat) => {
            if (chat.id === data.fromUserId) {
              return {
                ...chat,
                lastMessage: data.message,
                timestamp: new Date(data.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                lastMessageTime: new Date(data.timestamp),
                unread: isActiveChat ? chat.unread : (chat.unread || 0) + 1,
              };
            }
            return chat;
          })
          .sort((a, b) => {
            // Sort by last message time, most recent first
            if (!a.lastMessageTime && !b.lastMessageTime) return 0;
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
          });
      });

      // Mark as read if it's the active chat (run after state updates)
      if (isActiveChat) {
        setTimeout(() => {
          markMessagesAsRead(data.fromUserId).catch((error) =>
            console.error('Failed to mark messages as read:', error)
          );
        }, 0);
      }
    };

    onMessageReceived(handleMessageReceived);

    return () => {
      offFriendshipCreated(handleFriendshipCreated);
      offMessageReceived(handleMessageReceived);
    };
  }, [
    session,
    isPending,
    router,
    onFriendshipCreated,
    offFriendshipCreated,
    onMessageReceived,
    offMessageReceived,
  ]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) return;

    // Check if we've already loaded messages for this chat
    if (loadedChatsRef.current.has(activeChatId)) {
      // Just mark as read if we already loaded this chat
      markMessagesAsRead(activeChatId).catch((error) =>
        console.error('Failed to mark messages as read:', error)
      );

      // Update unread count in chats list
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChatId ? { ...chat, unread: 0 } : chat
        )
      );
      return;
    }

    const loadMessages = async () => {
      try {
        const messages = await getMessages(activeChatId);
        const formattedMessages = messages.map((msg) => ({
          id: msg.id,
          text: msg.content,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isSent: msg.senderId === session?.user?.id,
        }));

        // Store messages in separate map
        setMessagesMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(activeChatId, formattedMessages);
          return newMap;
        });

        // Mark this chat as loaded
        loadedChatsRef.current.add(activeChatId);

        // Mark messages as read
        await markMessagesAsRead(activeChatId);

        // Update unread count in chats list
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChatId ? { ...chat, unread: 0 } : chat
          )
        );
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [activeChatId, session?.user?.id]);

  // Handler for when a chat is selected
  const handleChatSelect = (chat: TChat) => {
    setActiveChatId(chat.id);
  };

  if (isPending || loading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-screen">
      <ChatList
        chats={chats}
        activeChat={activeChat!}
        onChatSelect={handleChatSelect}
      />
      <ChatArea chat={activeChat!} onMessageSent={handleMessageSent} />
    </div>
  );
}
