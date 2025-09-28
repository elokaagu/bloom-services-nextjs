import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  User,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export interface Citation {
  id: string;
  documentId: string;
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

export const ChatInterface = ({
  onSourceView,
  workspaceId = "550e8400-e29b-41d4-a716-446655440001", // Policy Research workspace UUID
  userId = "550e8400-e29b-41d4-a716-446655440002", // John Doe user UUID
}: ChatInterfaceProps) => {
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

  // Helper function to process documents if needed
  const processDocumentsIfNeeded = async () => {
    try {
      const response = await fetch("/api/process-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Document processing result:", result);
        return result;
      }
    } catch (error) {
      console.error("Error processing documents:", error);
    }
    return null;
  };

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
      console.log("Sending chat request with:", {
        workspaceId,
        userId,
        question,
      });
      const response = await fetch("/api/simple-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          userId,
          question,
        }),
      });

      const data = await response.json();

      // Normal response handling - the simple chat API handles everything
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer,
        citations: data.citations?.map((c: any) => ({
          id: c.chunkId?.toString() || c.index?.toString(),
          documentTitle: c.documentTitle || `Document ${c.documentId}`,
          snippet: c.text || "Retrieved from document",
          relevanceScore: 0.9,
        })),
        timestamp: new Date(),
        isError: false, // Simple chat API handles errors internally
        errorType: undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "Sorry, I encountered an error while processing your question. Please try again.",
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
                          <Image
                            src="/bloom_logo_icon.png"
                            alt="Bloom AI"
                            width={16}
                            height={16}
                            className="h-4 w-4"
                          />
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
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic">{children}</em>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside mb-2 space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside mb-2 space-y-1">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm">{children}</li>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-lg font-bold mb-2">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-bold mb-2">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-bold mb-1">
                                {children}
                              </h3>
                            ),
                            code: ({ children }) => (
                              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto mb-2">
                                {children}
                              </pre>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
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
                      <Image
                        src="/bloom_logo_icon.png"
                        alt="Bloom AI"
                        width={16}
                        height={16}
                        className="h-4 w-4"
                      />
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
      <div className="w-80 flex flex-col h-full">
        {/* Title Section */}
        <div className="mb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Sources
          </h3>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {messages.length > 1 ? (
            <div className="flex-1 p-3 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {messages
                    .filter(
                      (m) =>
                        m.type === "assistant" &&
                        m.citations &&
                        m.citations.length > 0
                    )
                    .slice(-3) // Show last 3 assistant messages with citations
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
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className="text-sm font-medium text-foreground leading-tight">
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
