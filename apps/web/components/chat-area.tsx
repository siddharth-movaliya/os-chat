'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TChat, TMessage } from '@/types/chat';
import { AddFriendDialog } from './add-friend';
import { useSocket } from '@/context/SocketProvider';

interface ChatAreaProps {
  chat: TChat;
  onMessageSent: (chatId: string, message: string, timestamp: number) => void;
}

export function ChatArea({ chat, onMessageSent }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, userPresence } = useSocket();
  const isOnline = chat?.id ? userPresence.get(chat.id) === 'online' : false;

  const handleSend = () => {
    if (message.trim() && chat?.id) {
      const timestamp = Date.now();
      sendMessage(chat.id, message.trim());

      // Notify parent component to update state
      onMessageSent(chat.id, message.trim(), timestamp);

      setMessage('');
    }
  };

  return (
    <div className="bg-background flex flex-1 flex-col">
      {!chat ? (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <MessageSquare className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="text-foreground mb-2 text-lg font-semibold">
              Select a conversation
            </h3>
            <p className="text-muted-foreground mb-4">
              Choose a chat from the list or add friends to start a new
              conversation.
            </p>
            <div className="flex items-center justify-center">
              <AddFriendDialog />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="border-border bg-card flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={chat.avatar} alt={chat.name} />
                <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-foreground font-semibold">{chat.name}</h2>
                <p
                  className={cn(
                    'relative flex items-center text-xs',
                    isOnline ? '' : 'text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'absolute inline-flex size-2.5 animate-ping rounded-full bg-emerald-400 opacity-75',
                      !isOnline && 'hidden'
                    )}
                  ></span>
                  <span
                    className={cn(
                      'relative mr-1.5 inline-flex size-2.5 rounded-full',
                      isOnline ? 'bg-emerald-500' : 'bg-red-400'
                    )}
                  ></span>
                  {isOnline ? 'Active now' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {chat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {/* Input Area */}
          <div className="border-border bg-card border-t p-4">
            <div className="flex items-end gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="bg-muted/50 flex-1 border-0"
              />
              <Button onClick={handleSend} size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: TMessage }) {
  return (
    <div
      className={cn('flex', message.isSent ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          message.isSent
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        <p className="text-sm leading-relaxed text-balance">{message.text}</p>
        <span
          className={cn(
            'mt-1 block text-xs',
            message.isSent
              ? 'text-primary-foreground/70'
              : 'text-muted-foreground'
          )}
        >
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}
