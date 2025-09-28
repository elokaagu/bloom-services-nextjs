"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  Share,
  FileText,
  Eye,
  Users,
  Lock,
  Globe,
  TrendingUp,
  MessageCircle,
  Calendar,
  User,
  FileIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Document } from "@/components/documents/DocumentCard";

interface DocumentViewProps {
  document: Document;
  onBack: () => void;
}

const getACLInfo = (acl: Document["acl"]) => {
  const variants = {
    private: {
      label: "Private",
      icon: Lock,
      description: "Only you can access this document",
      className: "text-gray-600",
    },
    workspace: {
      label: "Workspace",
      icon: Users,
      description: "Accessible to all workspace members",
      className: "text-blue-600",
    },
    organization: {
      label: "Organization",
      icon: Globe,
      description: "Accessible to all organization members",
      className: "text-green-600",
    },
  };

  return variants[acl];
};

export const DocumentView = ({ document, onBack }: DocumentViewProps) => {
  const [activeTab, setActiveTab] = useState("content");
  const [documentContent, setDocumentContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentSource, setContentSource] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  const aclInfo = getACLInfo(document.acl);
  const Icon = aclInfo.icon;

  const fetchDocumentContent = useCallback(async () => {
    try {
      setIsLoadingContent(true);
      setContentError(null);

      console.log("Fetching document content for:", document.id);

      const response = await fetch(
        `/api/documents/content?documentId=${document.id}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch document content: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setDocumentContent(data.content);
        setContentSource(data.contentSource);
        console.log("Document content loaded successfully:", {
          contentLength: data.contentLength,
          contentSource: data.contentSource,
          hasChunks: data.hasChunks,
        });
      } else {
        throw new Error(data.error || "Failed to load document content");
      }
    } catch (error) {
      console.error("Error fetching document content:", error);
      setContentError(
        error instanceof Error ? error.message : "Failed to load content"
      );

      // Set fallback content
      setDocumentContent(`# ${document.title}

This document is ready but there's an issue accessing its content. This might be a temporary storage issue.

**Status:** ${document.status}
**Uploaded:** ${document.uploadedAt}

**To fix this:**
1. Try refreshing the page
2. If the issue persists, try re-uploading the document
3. Or contact support if the problem continues`);
      setContentSource("fallback");
    } finally {
      setIsLoadingContent(false);
    }
  }, [document.id]);

  useEffect(() => {
    fetchDocumentContent();
  }, [document.id, fetchDocumentContent]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchDocumentContent();
  };

  const handleDownload = async () => {
    try {
      console.log("Downloading document:", document.title);

      // Check if we're in a browser environment
      if (typeof window === "undefined" || typeof document === "undefined") {
        console.error(
          "Download can only be initiated from browser environment"
        );
        return;
      }

      // Try to get the file from storage
      const response = await fetch(
        `/api/documents/download?documentId=${document.id}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to download document: ${response.statusText} - ${
            errorData.error || "Unknown error"
          }`
        );
      }

      // Get the file blob
      const blob = await response.blob();

      // Create download link using a more robust approach
      const url = window.URL.createObjectURL(blob);
      
      // Use a more defensive approach to create the link
      let link: HTMLAnchorElement;
      try {
        link = document.createElement("a");
      } catch (error) {
        console.error("Failed to create anchor element:", error);
        // Fallback: try to open the URL directly
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
        console.log("Download started successfully (fallback method)");
        return;
      }

      link.href = url;
      link.download = document.title;
      link.style.display = "none";

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(url);

      console.log("Download started successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const handleShare = () => {
    console.log("Sharing document:", document.title);
  };

  const renderContent = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Loading document content...
          </span>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-2 text-lg font-semibold">
            Error loading content
          </p>
          <p className="text-sm text-muted-foreground mb-4">{contentError}</p>
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again ({retryCount}/3)
          </Button>
        </div>
      );
    }

    // Safe content rendering without dangerouslySetInnerHTML
    return (
      <div className="prose prose-sm max-w-none">
        {(() => {
          // Improved paragraph splitting - handle multiple formats
          let paragraphs = documentContent
            // First split on double newlines
            .split(/\n\s*\n/)
            // If no double newlines, split on single newlines but be smarter about it
            .flatMap(p => {
              if (p.includes('\n') && !p.includes('\n\n')) {
                // Split on single newlines but group related content
                return p.split('\n').reduce((acc, line) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return acc;
                  
                  // If current line is short and previous line is long, combine them
                  if (acc.length > 0 && trimmedLine.length < 50 && acc[acc.length - 1].length > 50) {
                    acc[acc.length - 1] += ' ' + trimmedLine;
                  } else {
                    acc.push(trimmedLine);
                  }
                  return acc;
                }, [] as string[]);
              }
              return [p.trim()];
            })
            .filter(p => p.trim().length > 0);

          return paragraphs.map((paragraph, index) => {
            const trimmedParagraph = paragraph.trim();
            if (!trimmedParagraph) return null;

            // Handle headings
            if (trimmedParagraph.startsWith("# ")) {
            return (
              <h1
                key={index}
                className="text-3xl font-bold mb-6 text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent border-b border-border/20 pb-3"
              >
                {trimmedParagraph.slice(2)}
              </h1>
            );
          } else if (trimmedParagraph.startsWith("## ")) {
            return (
              <h2
                key={index}
                className="text-2xl font-semibold mb-4 mt-8 text-foreground relative"
              >
                <span className="absolute -left-4 top-0 w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full"></span>
                {trimmedParagraph.slice(3)}
              </h2>
            );
          } else if (trimmedParagraph.startsWith("### ")) {
            return (
              <h3
                key={index}
                className="text-xl font-medium mb-3 mt-6 text-foreground/90"
              >
                {trimmedParagraph.slice(4)}
              </h3>
            );
          } else if (trimmedParagraph.startsWith("- ")) {
            return (
              <div key={index} className="flex items-start mb-2 ml-6">
                <div className="w-2 h-2 bg-primary/60 rounded-full mt-2.5 mr-3 flex-shrink-0"></div>
                <p className="text-foreground/80 leading-relaxed">
                  {trimmedParagraph.slice(2)}
                </p>
              </div>
            );
          } else if (trimmedParagraph.match(/^\d+\. /)) {
            const number = trimmedParagraph.match(/^(\d+)\. /)?.[1];
            const text = trimmedParagraph.replace(/^\d+\. /, "");
            return (
              <div key={index} className="flex items-start mb-2 ml-6">
                <span className="w-6 h-6 bg-primary/20 text-primary text-sm font-medium rounded-full flex items-center justify-center mt-1 mr-3 flex-shrink-0">
                  {number}
                </span>
                <p className="text-foreground/80 leading-relaxed">{text}</p>
              </div>
            );
          } else if (trimmedParagraph.trim() === "") {
            return <div key={index} className="h-4"></div>;
          } else {
            return (
              <p
                key={index}
                className="text-foreground/80 leading-relaxed mb-4"
              >
                {trimmedParagraph}
              </p>
            );
          }
        });
        })()}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 gap-4">
          <div className="flex items-start space-x-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Library</span>
              <span className="sm:hidden">Back</span>
            </Button>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                  {document.title}
                </h1>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>
                    {document.summary
                      ? document.summary.split("\n")[0]
                      : document.size}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    Uploaded {document.uploadedAt}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Badge variant="outline" className={`${aclInfo.className} text-xs`}>
              <Icon className="h-3 w-3 mr-1" />
              {aclInfo.label}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 px-2 sm:px-3"
            >
              <Share className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2 sm:px-3"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-6 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="content" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Document Content</span>
                <span className="sm:hidden">Content</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="metadata" className="text-xs sm:text-sm">
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="flex-1 mt-0">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 h-full">
                <ScrollArea className="h-[50vh] sm:h-[60vh] lg:h-[70vh] w-full rounded-md">
                  <div className="p-4 sm:p-8 max-w-none">{renderContent()}</div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 mt-0">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 h-full">
                <div className="p-4 sm:p-8">
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Document Analytics
                    </h3>
                    <p className="text-muted-foreground">
                      Analytics for this document will be available soon.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" className="flex-1 mt-0">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 h-full">
                <div className="p-4 sm:p-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Document Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Title
                        </label>
                        <p className="text-sm text-foreground">
                          {document.title}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Status
                        </label>
                        <p className="text-sm text-foreground capitalize">
                          {document.status}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Size
                        </label>
                        <p className="text-sm text-foreground">
                          {document.size}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Uploaded
                        </label>
                        <p className="text-sm text-foreground">
                          {document.uploadedAt}
                        </p>
                      </div>


                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Access Level
                        </label>
                        <p className="text-sm text-foreground capitalize">
                          {document.acl}
                        </p>
                      </div>
                    </div>

                    {contentSource && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Content Source
                        </label>
                        <p className="text-sm text-foreground capitalize">
                          {contentSource}
                        </p>
                      </div>
                    )}

                    {document.summary && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Summary
                        </label>
                        <p className="text-sm text-foreground">
                          {document.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
