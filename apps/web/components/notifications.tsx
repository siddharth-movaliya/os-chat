'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getFriendRequests,
  respondToFriendRequest,
} from '@/services/user/friendRequests';
import { TFriendRequestWithSender } from '@/types/user/friendRequests';
import { useSocket } from '@/context/SocketProvider';

export function NotificationsButton() {
  const {
    onFriendRequestReceived,
    offFriendRequestReceived,
    respondToFriendRequestFromSocket,
  } = useSocket();
  const [friendRequests, setFriendRequests] = useState<
    TFriendRequestWithSender[]
  >([]);

  useEffect(() => {
    const loadFriendRequests = async () => {
      try {
        const requests = await getFriendRequests();
        setFriendRequests(requests as TFriendRequestWithSender[]);
      } catch (error) {
        console.error('Failed to load friend requests:', error);
      }
    };

    loadFriendRequests();

    // Handle real-time friend request
    const handleNewRequest = (request: TFriendRequestWithSender) => {
      setFriendRequests((prev) => [
        request as TFriendRequestWithSender,
        ...prev,
      ]);
    };

    onFriendRequestReceived(handleNewRequest);

    return () => {
      offFriendRequestReceived(handleNewRequest);
    };
  }, [onFriendRequestReceived, offFriendRequestReceived]);

  const handleFriendRequestUpdate = async (id: string, accept: boolean) => {
    try {
      // Update request in database
      await respondToFriendRequest(id, accept);

      // Notify via socket
      respondToFriendRequestFromSocket(
        friendRequests.find((request) => request.id === id)!.sender,
        id,
        accept
      );
      setFriendRequests((prev) => prev.filter((request) => request.id !== id));
    } catch (error) {
      console.error('Failed to update friend request:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {friendRequests.length > 0 && (
            <span className="text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs font-semibold">
              {friendRequests.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0">
        <div className="border-border border-b p-4">
          <h3 className="text-foreground font-semibold">Friend Requests</h3>
          {friendRequests.length > 0 && (
            <p className="text-muted-foreground mt-1 text-sm">
              {friendRequests.length} pending{' '}
              {friendRequests.length === 1 ? 'request' : 'requests'}
            </p>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {friendRequests.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
                No friend requests
              </p>
            </div>
          ) : (
            <div className="p-2">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-3 transition-colors"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage
                      src={request.sender.image || '/placeholder.svg'}
                      alt={request.sender.name}
                    />
                    <AvatarFallback>
                      {request.sender.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-foreground truncate text-sm font-medium">
                      {request.sender.name}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() =>
                        handleFriendRequestUpdate(request.id, true)
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 bg-transparent px-3 text-xs"
                      onClick={() =>
                        handleFriendRequestUpdate(request.id, false)
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
