import { useState, useRef, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Textarea } from '@renderer/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { MessageCircle, Send } from 'lucide-react';
import { EncryptedConnection } from '@renderer/types';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatProps {
  activeConnection?: EncryptedConnection | null;
  activeTable?: string | null;
  lastQuery?: string | null;
  setLastQuery: (query: string) => void;
}

const AiChat = ({ activeConnection, activeTable, setLastQuery }: AiChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your database assistant. Ask me questions about database queries."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setIsLoading(true);

    const reply = await window.api.askAI(activeConnection?.id!, input, activeTable);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: reply.success ? reply.response! : reply.error! }
    ]);
    setIsLoading(false);
  };

  const handleUseQuery = (message) => {
    if (message) {
      setLastQuery(message);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 min-h-0 flex-col p-0">
        <ScrollArea className="flex-1 min-h-0 h-full" allowVerticalScroll>
          <div className="space-y-4 px-4 py-3">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {i !== 0 &&
                    message.role === 'assistant' &&
                    !message.content.startsWith('Not applicable') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleUseQuery(message.content)}
                      >
                        Apply Query
                      </Button>
                    )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted w-[80%] rounded-lg p-3">
                  <p className="animate-pulse">
                    Thinking<span className="dot-flash">.</span>
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex-end flex items-center gap-2 border-t p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter prompt..."
            autoComplete="off"
            className="resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AiChat;
