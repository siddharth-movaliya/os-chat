'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chat } from '@/types/chat';

interface ChatListProps {
  chats: Chat[];
  activeChat: Chat;
  onChatSelect: (chat: Chat) => void;
}

export function ChatList({ chats, activeChat, onChatSelect }: ChatListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const name = c.name?.toLowerCase() ?? '';
      const last = c.lastMessage?.toLowerCase() ?? '';
      return name.includes(q) || last.includes(q);
    });
  }, [chats, query]);

  return (
    <div className="border-border bg-card flex w-full flex-col border-r md:w-96">
      {/* Header */}
      <div className="border-border border-b p-4">
        <h1 className="text-foreground mb-4 text-2xl font-semibold">
          Messages
        </h1>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search messages"
            className="bg-muted/50 border-0 pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search chats"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No chats match &quot;{query}&quot;
          </div>
        ) : (
          filtered.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatSelect(chat)}
              className={cn(
                'hover:bg-muted/50 border-border/50 flex w-full items-start gap-3 border-b p-4 transition-colors',
                activeChat.id === chat.id && 'bg-muted'
              )}
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage
                  src={chat.avatar || '/placeholder.svg'}
                  alt={chat.name}
                />
                <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 text-left">
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className="text-foreground truncate font-semibold">
                    {chat.name}
                  </h3>
                  <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                    {chat.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground truncate text-sm">
                    {query.trim()
                      ? chat.lastMessage
                          ?.split(
                            new RegExp(`\\b(\\w*${query.trim()}\\w*)\\b`, 'gi')
                          )
                          .map((part, i) => (
                            <span
                              key={i}
                              className={
                                part
                                  .toLowerCase()
                                  .includes(query.trim().toLowerCase())
                                  ? 'text-black'
                                  : ''
                              }
                            >
                              {part}
                            </span>
                          ))
                      : chat.lastMessage}
                  </p>
                  {chat.unread && (
                    <span className="bg-primary text-primary-foreground ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
