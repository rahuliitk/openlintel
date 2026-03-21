'use client';

import { use, useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Skeleton,
  Input,
  Separator,
  toast,
} from '@openlintel/ui';
import {
  Scale,
  Send,
  Loader2,
  Bot,
  User,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Trash2,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { code: string; section: string; text: string }[];
  createdAt: string;
}

const QUICK_PROMPTS = [
  'What are the minimum bedroom dimensions for IRC?',
  'Check my project for egress window compliance',
  'What are ADA bathroom requirements?',
  'Explain fire separation requirements between units',
  'What is the minimum ceiling height for habitable rooms?',
  'Check stairway code compliance for my design',
];

/* ─── Page Component ────────────────────────────────────────── */

export default function ComplianceChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');

  const { data: messages = [], isLoading } = trpc.complianceChat.listMessages.useQuery({ projectId });

  const sendMessage = trpc.complianceChat.sendMessage.useMutation({
    onSuccess: () => {
      utils.complianceChat.listMessages.invalidate({ projectId });
      setInput('');
    },
    onError: (err) => {
      toast({ title: 'Failed to send message', description: err.message, variant: 'destructive' });
    },
  });

  const clearChat = trpc.complianceChat.clearHistory.useMutation({
    onSuccess: () => {
      utils.complianceChat.listMessages.invalidate({ projectId });
      toast({ title: 'Chat cleared' });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate({ projectId, message: input.trim() });
  }

  function handleQuickPrompt(prompt: string) {
    setInput(prompt);
    sendMessage.mutate({ projectId, message: prompt });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Code Compliance Chat</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about building codes, zoning, and compliance requirements.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <BookOpen className="mr-1 h-3 w-3" />
            IRC 2021 &middot; IBC 2021 &middot; ADA
          </Badge>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => clearChat.mutate({ projectId })} disabled={clearChat.isPending}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Bot className="mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">Code Compliance Assistant</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Ask me about building codes, zoning requirements, ADA compliance, or check your
                project design against specific code sections.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 max-w-lg">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="rounded-lg border p-3 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: ChatMessage) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.citations.map((citation, idx) => (
                          <div key={idx} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                            <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">{citation.code} - {citation.section}</p>
                              <p className="text-muted-foreground">{citation.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {sendMessage.isPending && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Analyzing codes...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <Separator />

        {/* Input Area */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ask about building codes, compliance requirements..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sendMessage.isPending}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim() || sendMessage.isPending}>
              {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Responses are AI-generated based on IRC, IBC, and ADA codes. Always verify with your local jurisdiction.
          </p>
        </div>
      </Card>
    </div>
  );
}
