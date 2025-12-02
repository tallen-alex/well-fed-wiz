import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Mail, MailOpen } from "lucide-react";

interface Message {
  id: string;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
  sender: {
    full_name: string | null;
  };
}

export function ClientMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user]);

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('client-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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
        .select("id, subject, message, read, created_at, sender_id")
        .eq("recipient_id", user?.id)
        .order("created_at", { ascending: false });

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
        sender: {
          full_name: profileMap.get(msg.sender_id)?.full_name || "Samira",
        },
      })) || [];

      setMessages(formattedMessages);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessage = async (message: Message) => {
    setSelectedMessage(message);

    if (!message.read) {
      try {
        const { error } = await supabase
          .from("messages")
          .update({ read: true })
          .eq("id", message.id);

        if (error) throw error;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message.id ? { ...msg, read: true } : msg
          )
        );
      } catch (error: any) {
        console.error("Failed to mark message as read:", error);
      }
    }
  };

  const unreadCount = messages.filter((msg) => !msg.read).length;

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Messages from Samira</CardTitle>
              <CardDescription>
                {unreadCount > 0
                  ? `You have ${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                  : "All messages read"}
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Badge variant="default">{unreadCount} New</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => handleOpenMessage(message)}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    message.read
                      ? "bg-muted/50 hover:bg-muted"
                      : "bg-primary/10 hover:bg-primary/15"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {message.read ? (
                      <MailOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p
                          className={`font-medium ${
                            !message.read ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {message.subject || "New Message"}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(message.created_at), "MMM d")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {message.sender.full_name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMessage?.subject || "Message from Samira"}
            </DialogTitle>
            <DialogDescription>
              From {selectedMessage?.sender.full_name} •{" "}
              {selectedMessage && format(new Date(selectedMessage.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground whitespace-pre-wrap">
              {selectedMessage?.message}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setSelectedMessage(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
