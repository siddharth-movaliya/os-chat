'use client';

import { User } from '@repo/prisma/client';
import { authClient } from '@/lib/auth-client';
import { TFriendRequestWithSender } from '@/types/user/friendRequests';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';

interface ISocketContext {
  socket: Socket;
  isConnected: boolean;
  userPresence: Map<string, 'online' | 'offline'>;
  sendMessage: (toUserId: string, message: string) => void;
  sendFriendRequestFromSocket: (
    toUserId: string,
    friendRequest: TFriendRequestWithSender
  ) => void;
  respondToFriendRequestFromSocket: (
    toUser: User,
    requestId: string,
    accept: boolean
  ) => void;
  onMessageReceived: (
    callback: (data: {
      fromUserId: string;
      message: string;
      timestamp: number;
    }) => void
  ) => void;
  offMessageReceived: (
    callback: (data: {
      fromUserId: string;
      message: string;
      timestamp: number;
    }) => void
  ) => void;
  onFriendRequestReceived: (
    callback: (request: TFriendRequestWithSender) => void
  ) => void;
  offFriendRequestReceived: (
    callback: (request: TFriendRequestWithSender) => void
  ) => void;
  onFriendshipCreated: (
    callback: (data: { userId: string; name: string; image: string }) => void
  ) => void;
  offFriendshipCreated: (
    callback: (data: { userId: string; name: string; image: string }) => void
  ) => void;
  onUserPresenceChanged: (
    callback: (data: {
      userId: string;
      status: 'online' | 'offline';
      name?: string;
    }) => void
  ) => void;
  offUserPresenceChanged: (
    callback: (data: {
      userId: string;
      status: 'online' | 'offline';
      name?: string;
    }) => void
  ) => void;
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
    // Initialize socket only once with autoConnect: false
    return io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', {
      transports: ['websocket'],
      autoConnect: false, // Don't auto-connect until we have a token
      withCredentials: true,
      auth: async (cb) => {
        try {
          const res = await authClient.token();
          const token = res?.data?.token;

          if (!token) {
            return cb({ error: 'NO_TOKEN' });
          }

          cb({ token });
        } catch (err) {
          console.error('Error fetching token:', err);
          cb({ error: 'TOKEN_FETCH_FAILED' });
        }
      },
    });
  });
  const [isConnected, setIsConnected] = useState(false);
  const [userPresence, setUserPresence] = useState<
    Map<string, 'online' | 'offline'>
  >(new Map());

  useEffect(() => {
    // Check if user is logged in before connecting
    const checkAuthAndConnect = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.session) {
          // Only connect if we have a session
          if (!socket.connected) {
            socket.connect();
          }
        } else {
          // Disconnect if no session
          if (socket.connected) {
            socket.disconnect();
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuthAndConnect();

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

    // Listen for user presence changes
    socket.on('user:presence_changed', ({ userId, status }) => {
      console.log(`User ${userId} is now ${status}`);
      setUserPresence((prev) => new Map(prev).set(userId, status));
    });

    // Cleanup on unmount - DO NOT disconnect socket on every re-render
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('user:presence_changed');
    };
  }, [socket]);

  const sendMessage = useCallback(
    (toUserId: string, message: string) => {
      if (socket && isConnected) {
        socket.emit('message:send', {
          toUserId: toUserId,
          message: message,
        });
      } else {
        console.warn('Socket is not connected. Cannot send message.');
      }
    },
    [socket, isConnected]
  );

  // Send friend request via socket
  const sendFriendRequestFromSocket = (
    toUserId: string,
    friendRequest: TFriendRequestWithSender
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Socket is not connected'));
        return;
      }

      // Set timeout for response
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      socket.emit(
        'friend_request:send',
        { toUserId, friendRequest },
        (response: { success: boolean; error?: string }) => {
          clearTimeout(timeout);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send request'));
          }
        }
      );
    });
  };

  // Respond to friend request via socket
  const respondToFriendRequestFromSocket = (
    toUser: User,
    requestId: string,
    accept: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        reject(new Error('Socket is not connected'));
        return;
      }

      // Set timeout for response
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      socket.emit(
        'friend_request:respond',
        { toUser, requestId, accept },
        (response: { success: boolean; error?: string }) => {
          clearTimeout(timeout);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send request'));
          }
        }
      );
    });
  };

  const onMessageReceived = useCallback(
    (
      callback: (data: {
        fromUserId: string;
        message: string;
        timestamp: number;
      }) => void
    ) => {
      socket.off('message:received'); // Prevent duplicate listeners
      socket.on('message:received', callback);
    },
    [socket]
  );

  const offMessageReceived = useCallback(
    (
      callback: (data: {
        fromUserId: string;
        message: string;
        timestamp: number;
      }) => void
    ) => {
      socket.off('message:received', callback);
    },
    [socket]
  );

  const onFriendRequestReceived = useCallback(
    (callback: (request: TFriendRequestWithSender) => void) => {
      socket.off('friend_request:received'); // Prevent duplicate listeners
      socket.on('friend_request:received', ({ friendRequest }) => {
        callback(friendRequest);
      });
    },
    [socket]
  );

  const offFriendRequestReceived = useCallback(
    (callback: (request: TFriendRequestWithSender) => void) => {
      socket.off('friend_request:received', callback);
    },
    [socket]
  );

  const onFriendshipCreated = useCallback(
    (
      callback: (data: { userId: string; name: string; image: string }) => void
    ) => {
      socket.off('friendship:created'); // Prevent duplicate listeners
      socket.on('friendship:created', (data) => {
        callback(data);
      });
    },
    [socket]
  );

  const offFriendshipCreated = useCallback(
    (
      callback: (data: { userId: string; name: string; image: string }) => void
    ) => {
      socket.off('friendship:created', callback);
    },
    [socket]
  );

  const onUserPresenceChanged = useCallback(
    (
      callback: (data: {
        userId: string;
        status: 'online' | 'offline';
        name?: string;
      }) => void
    ) => {
      socket.off('user:presence_changed');
      socket.on('user:presence_changed', callback);
    },
    [socket]
  );

  const offUserPresenceChanged = useCallback(
    (
      callback: (data: {
        userId: string;
        status: 'online' | 'offline';
        name?: string;
      }) => void
    ) => {
      socket.off('user:presence_changed', callback);
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        userPresence,
        sendMessage,
        sendFriendRequestFromSocket,
        respondToFriendRequestFromSocket,
        onMessageReceived,
        offMessageReceived,
        onFriendRequestReceived,
        offFriendRequestReceived,
        onFriendshipCreated,
        offFriendshipCreated,
        onUserPresenceChanged,
        offUserPresenceChanged,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
