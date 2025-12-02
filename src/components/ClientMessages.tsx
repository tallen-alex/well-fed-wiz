import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Mail, MailOpen, Send } from "lucide-react";

interface Message {
  id: string;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
  sender_id: string;
  sender: {
    full_name: string | null;
  };
}

export function ClientMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('client-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, subject, message, read, created_at, sender_id, recipient_id")
        .or(`recipient_id.eq.${user?.id},sender_id.eq.${user?.id}`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch sender profiles separately
      const senderIds = [...new Set(data?.map(msg => msg.sender_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const formattedMessages = data?.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject,
        message: msg.message,
        read: msg.read,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        sender: {
          full_name: profileMap.get(msg.sender_id)?.full_name || "Samira",
        },
      })) || [];

      setMessages(formattedMessages);
      
      // Mark all received messages as read
      const unreadIds = formattedMessages
        .filter((msg: Message) => !msg.read && msg.sender_id !== user?.id)
        .map((msg: Message) => msg.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    } catch (error: any) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    setSending(true);

    try {
      // Get admin ID
      const { data: adminRole, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (roleError) {
        throw roleError;
      }

      if (!adminRole) {
        toast({
          title: "Setup Required",
          description: "No admin account found. Please contact support or create an admin account first.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: user?.id,
        recipient_id: adminRole.user_id,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      fetchMessages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-sm text-muted-foreground">Loading messages...</div>;
  }

  return (
    <>
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[200px] pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No messages yet. Send a message to Samira!
          </div>
        ) : (
          messages.map((message) => {
            const isSentByMe = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isSentByMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                  </p>
                  <p className={`text-xs mt-1 ${isSentByMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2 mt-3">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          maxLength={2000}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !newMessage.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
