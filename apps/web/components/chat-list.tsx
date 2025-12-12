'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TChat } from '@/types/chat';
import { AddFriendDialog } from './add-friend';
import { NotificationsButton } from './notifications';
import { authClient } from '@/lib/auth-client';

type TChatListProps = {
  chats: TChat[];
  activeChat: TChat;
  onChatSelect: (chat: TChat) => void;
};

export function ChatList({ chats, activeChat, onChatSelect }: TChatListProps) {
  const { data: session } = authClient.useSession();
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

  filtered.map((chat) => {
    console.log(chat.name);
    console.log(chat.avatar);
  });

  return (
    <div className="border-border bg-card flex w-full flex-col border-r md:w-96">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-foreground flex gap-2 text-2xl font-semibold">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage
                src={session?.user?.image || '/placeholder.svg'}
                alt={session?.user?.name || 'User'}
              />
              <AvatarFallback>{session?.user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            Messages
          </h1>
          <div className="flex items-center gap-2">
            <NotificationsButton />
            <AddFriendDialog />
          </div>
        </div>
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
          <div className="flex h-full justify-center p-6">
            <div className="max-w-sm text-center">
              <MessageSquare className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="text-foreground mb-2 text-lg font-semibold">
                {chats.length === 0 ? 'No conversations yet' : 'No chats found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {chats.length === 0
                  ? "You don't have any friends yet — add friends to start chatting."
                  : query.trim()
                    ? `No chats match your search.`
                    : 'No chats to display.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {query.trim() && (
                  <button
                    onClick={() => setQuery('')}
                    className="bg-muted/50 rounded-md px-3 py-1 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          filtered.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatSelect(chat)}
              className={cn(
                'hover:bg-muted/50 border-border/50 flex w-full items-start gap-3 border-b p-4 transition-colors',
                activeChat?.id === chat.id && 'bg-muted'
              )}
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={chat.avatar} alt={chat.name} />
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
                  {chat.unread ? (
                    <span className="bg-primary text-primary-foreground ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {chat.unread > 9 ? '9+' : chat.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
