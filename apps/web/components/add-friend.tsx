'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchUsersByName } from '@/services/user/user';
import { sendFriendRequest } from '@/services/user/friendRequests';
import { authClient } from '@/lib/auth-client';
import { useSocket } from '@/context/SocketProvider';
import { TUserWithFriendRequests } from '@/types/user';

export function AddFriendDialog() {
  const { data: session } = authClient.useSession();
  const { sendFriendRequestFromSocket } = useSocket();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<TUserWithFriendRequests[]>(
    []
  );
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());

  // Fetch users when search query changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setFilteredUsers([]);
        return;
      }

      try {
        const users: TUserWithFriendRequests[] =
          await searchUsersByName(searchQuery);
        setFilteredUsers(users);
      } catch (error) {
        console.error('Failed to search users:', error);
        setFilteredUsers([]);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 300); // Debounce input by 300ms
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleAddUser = (receiverId: string) => {
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return;
    }

    sendFriendRequest(session.user.id, receiverId)
      .then((request) => {
        sendFriendRequestFromSocket(receiverId, request);
        setAddedUsers((prev) => new Set(prev).add(receiverId));
      })
      .catch((error) => {
        console.error('Failed to send friend request:', error);
      });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9">
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List - Scrollable */}
          <div className="space-y-1">
            {searchQuery && filteredUsers.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No users found
              </p>
            )}

            {searchQuery && filteredUsers.length > 0 && (
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {filteredUsers.map((user) => {
                  const isAdded = addedUsers.has(user.id);
                  // Check if there's a pending request from current user
                  const hasPendingRequestFromCurrentUser =
                    session?.user?.id &&
                    user.receivedRequests?.some(
                      (req) =>
                        req.senderId === session.user!.id &&
                        req.status === 'PENDING'
                    );
                  // Check if already friends (accepted request in either direction)
                  const isAlreadyFriends =
                    session?.user?.id &&
                    (user.receivedRequests?.some(
                      (req) =>
                        req.senderId === session.user!.id &&
                        req.status === 'ACCEPTED'
                    ) ||
                      user.sentRequests?.some(
                        (req) =>
                          req.receiverId === session.user!.id &&
                          req.status === 'ACCEPTED'
                      ));
                  const isDisabled =
                    !!isAdded ||
                    !!hasPendingRequestFromCurrentUser ||
                    !!isAlreadyFriends;
                  return (
                    <div
                      key={user.id}
                      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-3 transition-colors"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage
                          src={user.image || '/placeholder.svg'}
                          alt={user.name}
                        />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {user.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {user.email}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={
                          isAdded || isAlreadyFriends ? 'secondary' : 'default'
                        }
                        className={cn(
                          'h-8 shrink-0',
                          isDisabled && 'pointer-events-none opacity-70'
                        )}
                        onClick={() => handleAddUser(user.id)}
                        disabled={isDisabled}
                      >
                        {isAlreadyFriends ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Friends
                          </>
                        ) : isAdded ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Requested
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-1 h-3 w-3" />
                            Request
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {!searchQuery && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Start typing to search for friends
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
