'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat, Message } from '@/types/chat';

interface ChatAreaProps {
  chat: Chat;
}

export function ChatArea({ chat }: ChatAreaProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      // Handle sending message
      setMessage('');
    }
  };

  return (
    <div className="bg-background flex flex-1 flex-col">
      {/* Chat Header */}
      <div className="border-border bg-card flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={chat.avatar || '/placeholder.svg'}
              alt={chat.name}
            />
            <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-foreground font-semibold">{chat.name}</h2>
            <p className="text-muted-foreground text-xs">Active now</p>
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
          <Button onClick={handleSend} size="icon" className="flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
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
