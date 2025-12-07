'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ISocketContext {
  socket: Socket;
  isConnected: boolean;
  sendMessage: (message: string) => void;
}

const SocketContext = createContext<ISocketContext | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface ISocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<ISocketProviderProps> = ({
  children,
}) => {
  const [socket] = useState<Socket>(() => {
    // Initialize socket only once
    return io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', {
      transports: ['websocket'],
      autoConnect: true,
    });
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connection event handlers
    socket.on('connect', () => {
      console.log('Connected to socket server:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const sendMessage = (message: string) => {
    if (socket && isConnected) {
      socket.emit('event:message', message);
    } else {
      console.warn('Socket is not connected. Cannot send message.');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
};
