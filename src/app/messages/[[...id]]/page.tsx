
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

type Participant = {
  displayName: string;
  photoURL: string;
};

type Conversation = {
  id: string;
  participantIds: string[];
  participants: Record<string, Participant>;
  lastMessage: {
    text: string;
    timestamp: any;
    senderId: string;
  };
  productContext?: {
    id: string;
    title: string;
    imageUrl: string;
  };
  orderContext?: {
    id: string;
    status: string;
    total: number;
  };
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
};

function ConversationList({
  conversations,
  currentConversationId,
}: {
  conversations: Conversation[];
  currentConversationId: string | null;
}) {
  const { user } = useUser();

  return (
    <div
      className={cn(
        'w-full md:w-1/3 lg:w-1/4 border-r bg-gray-50 flex-col',
        currentConversationId ? 'hidden md:flex' : 'flex'
      )}
    >
      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold">Messages</h2>
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            No conversations yet.
          </div>
        ) : (
          conversations.map((convo) => {
            const otherParticipantId = convo.participantIds.find(id => id !== user?.uid)!;
            const otherParticipant = convo.participants[otherParticipantId];
            return (
              <Link href={`/messages/${convo.id}`} key={convo.id}>
                <div
                  className={cn(
                    'p-4 flex items-start gap-4 cursor-pointer border-b hover:bg-gray-100',
                    convo.id === currentConversationId && 'bg-primary/5'
                  )}
                >
                  <Avatar>
                    <AvatarImage src={otherParticipant?.photoURL} />
                    <AvatarFallback>{otherParticipant?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{otherParticipant?.displayName}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {convo.lastMessage.timestamp && formatDistanceToNow(convo.lastMessage.timestamp.toDate(), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {convo.lastMessage.senderId === user?.uid && 'You: '}
                      {convo.lastMessage.text}
                    </p>
                    {convo.productContext && (
                      <div className="text-xs text-muted-foreground truncate mt-1 italic">
                        re: {convo.productContext.title}
                      </div>
                    )}
                    {convo.orderContext && (
                      <div className="text-[10px] font-black uppercase text-primary truncate mt-1 tracking-widest bg-primary/5 px-2 py-0.5 rounded-sm inline-block">
                        Order #{convo.orderContext.id.slice(-8).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}

function ConversationView({ conversationId }: { conversationId: string }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch conversation details
    const convoUnsub = onSnapshot(doc(db, 'conversations', conversationId), (doc) => {
      if (doc.exists()) {
        setConversation({ id: doc.id, ...doc.data() } as Conversation);
      }
    });

    // Fetch messages
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const messagesUnsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Message)
      );
      setMessages(msgs);
    });

    return () => {
      convoUnsub();
      messagesUnsub();
    };
  }, [conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    const messageText = newMessage;
    setNewMessage('');

    const messageData = {
      senderId: user.uid,
      text: messageText,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);

    // Update last message in conversation
    const convoRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoRef, {
      lastMessage: {
        text: messageText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      }
    });

  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const otherParticipantId = conversation.participantIds.find(id => id !== user?.uid)!;
  const otherParticipant = conversation.participants[otherParticipantId];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/messages')}>
          <ArrowLeft />
        </Button>
        <Avatar>
          <AvatarImage src={otherParticipant.photoURL} />
          <AvatarFallback>{otherParticipant.displayName[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{otherParticipant.displayName}</h3>
        </div>
      </div>

      {conversation.productContext && (
        <div className="p-3 border-b bg-gray-50/50">
          <Link href={`/product/${conversation.productContext.id}`} className="flex items-center gap-3 hover:bg-white/50 p-2 rounded-xl transition-all border border-transparent hover:border-slate-100">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-slate-100">
              <Image src={conversation.productContext.imageUrl} alt={conversation.productContext.title} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Product Protocol</p>
              <p className="text-sm font-bold text-slate-900 line-clamp-1">{conversation.productContext.title}</p>
            </div>
          </Link>
        </div>
      )}

      {conversation.orderContext && (
        <div className="p-3 border-b bg-slate-900 text-white">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Order Tracking</p>
                <p className="text-xs font-bold font-mono">#{conversation.orderContext.id.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</p>
              <p className="text-xs font-bold text-primary uppercase">{conversation.orderContext.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2',
                message.senderId === user?.uid ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'p-3 rounded-lg max-w-xs md:max-w-md',
                  message.senderId === user?.uid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}


export default function MessagesPage() {
  const { user } = useUser();
  const pathname = usePathname();
  const conversationId = pathname.split('/')[2] || null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    setTimeout(() => {
      setLoading(true);
    }, 0);
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Conversation)
      );
      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <ConversationList conversations={conversations} currentConversationId={conversationId} />
      <div className={cn(
        'flex-1 flex-col',
        conversationId ? 'flex' : 'hidden md:flex'
      )}>
        {conversationId ? (
          <ConversationView conversationId={conversationId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="text-gray-500">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold">Select a conversation</h2>
              <p>Or start a new one from a product page.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
