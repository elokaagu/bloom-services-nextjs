import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Citation {
  id: string;
  documentTitle: string;
  pageNumber?: number;
  section?: string;
  snippet: string;
  relevanceScore: number;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isError?: boolean;
  errorType?: "permission" | "system";
}

interface ChatInterfaceProps {
  onSourceView: (citation: Citation) => void;
  workspaceId?: string;
  userId?: string;
}

export const ChatInterface = ({ onSourceView, workspaceId = 'default-workspace', userId = 'default-user' }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your Bloom AI assistant. I can help you find information from your organization's documents. What would you like to know?",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Mock responses with citations and permission scenarios
  const mockResponses = [
    {
      content:
        "Based on the documents in your workspace, the data retention policy requires all customer data to be retained for a minimum of 7 years for compliance purposes. However, personal data can be deleted upon request under GDPR Article 17 (Right to Erasure), with some exceptions for legal obligations.",
      citations: [
        {
          id: "c1",
          documentTitle: "Data Retention Policy 2024.pdf",
          pageNumber: 3,
          section: "Section 2.1 - Customer Data",
          snippet:
            "All customer transactional data must be retained for a period of seven (7) years from the date of last customer interaction...",
          relevanceScore: 0.95,
        },
        {
          id: "c2",
          documentTitle: "GDPR Compliance Guide.docx",
          pageNumber: 12,
          section: "Right to Erasure",
          snippet:
            "Under Article 17 of GDPR, individuals have the right to have their personal data erased in specific circumstances...",
          relevanceScore: 0.88,
        },
      ],
    },
    {
      content:
        "🚫 **Access Denied**\n\nI don't have access to the Q3 2024 Financial Report. This document is marked as **Private** and is only accessible to its owner (Emily Watson).\n\n**Why this happened:**\n• Document has private access control level\n• You don't have explicit permission to view this content\n\n**What you can do:**\n1. Contact Emily Watson directly for access\n2. Request workspace admin to change document permissions\n3. Look for similar information in workspace-level documents",
      isError: true,
      errorType: "permission" as const,
      citations: [],
    },
    {
      content:
        "Here are the key security recommendations from your organization's security documentation:\n\n**Access Control:**\n• Implement multi-factor authentication for all systems\n• Use role-based access control (RBAC)\n• Regular access reviews every 90 days\n\n**Network Security:**\n• Deploy network segmentation\n• Monitor all network traffic\n• Use VPN for remote access\n\n**Data Protection:**\n• Encrypt data at rest and in transit\n• Regular backup verification\n• Implement data loss prevention (DLP)",
      citations: [
        {
          id: "c3",
          documentTitle: "Security Best Practices.pdf",
          pageNumber: 5,
          section: "Access Control Framework",
          snippet:
            "Multi-factor authentication should be enabled for all user accounts accessing corporate systems, with special attention to privileged accounts...",
          relevanceScore: 0.94,
        },
        {
          id: "c4",
          documentTitle: "Security Best Practices.pdf",
          pageNumber: 12,
          section: "Data Protection Standards",
          snippet:
            "All sensitive data must be encrypted using AES-256 encryption both at rest and during transmission across all corporate networks...",
          relevanceScore: 0.91,
        },
      ],
    },
  ];

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId, 
          userId, 
          question 
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const { answer, citations } = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: answer,
        citations: citations?.map((c: any) => ({
          id: c.chunkId.toString(),
          documentTitle: `Document ${c.documentId}`,
          snippet: 'Retrieved from document',
          relevanceScore: 0.9,
        })),
        timestamp: new Date(),
        isError: false,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
        isError: true,
        errorType: "system",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] space-y-4 lg:space-y-0 lg:space-x-6 px-2 sm:px-4 lg:px-8 pt-[var(--header-offset)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Title Section */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask questions about your documents
          </p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollAreaRef}>
            <div className="space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-2 sm:space-x-3",
                    message.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.type === "assistant" && (
                    <div className="flex-shrink-0">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          message.isError
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {message.isError ? (
                          message.errorType === "permission" ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] space-y-2",
                      message.type === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-4 py-3",
                        message.type === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.isError
                          ? "bg-destructive/10 border border-destructive/20 text-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {message.citations.map((citation) => (
                            <Badge
                              key={citation.id}
                              variant="secondary"
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => onSourceView(citation)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {citation.documentTitle}
                              {citation.pageNumber &&
                                ` (p.${citation.pageNumber})`}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {message.type === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your documents..."
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sources Panel */}
      <div className="w-80 flex flex-col">
        {/* Title Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Sources
          </h3>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {messages.length > 1 ? (
            <div className="flex-1 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {messages
                    .filter(
                      (m) =>
                        m.type === "assistant" &&
                        m.citations &&
                        m.citations.length > 0
                    )
                    .slice(-2) // Show last 2 assistant messages with citations
                    .map((message) => (
                      <div key={message.id} className="space-y-2">
                        {message.citations?.map((citation) => (
                          <Card
                            key={citation.id}
                            className="p-3 cursor-pointer hover:shadow-sm transition-shadow"
                          >
                            <div
                              className="flex items-start justify-between"
                              onClick={() =>
                                setExpandedSources(
                                  expandedSources === citation.id
                                    ? ""
                                    : citation.id
                                )
                              }
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground truncate">
                                  {citation.documentTitle}
                                </h4>
                                {citation.section && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {citation.section}
                                    {citation.pageNumber &&
                                      ` • Page ${citation.pageNumber}`}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-2"
                              >
                                {expandedSources === citation.id ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </div>

                            {expandedSources === citation.id && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {citation.snippet}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(citation.relevanceScore * 100)}%
                                    match
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => onSourceView(citation)}
                                  >
                                    View Full Document
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Sources and citations will appear here when you ask questions
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
