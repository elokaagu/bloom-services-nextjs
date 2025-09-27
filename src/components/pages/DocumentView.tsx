"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Copy,
  ExternalLink,
} from "lucide-react";
import { Document } from "@/components/documents/DocumentCard";
import { useToast } from "@/hooks/use-toast";
import { PDFViewer } from "@/components/pdf/PDFViewer";

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
  const [isUpdatingACL, setIsUpdatingACL] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"text" | "pdf">("text");
  const { toast } = useToast();

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

      console.log("API Response data:", data);

      if (data.success) {
        console.log("Setting document content:", {
          contentLength: data.content?.length || 0,
          contentSource: data.contentSource,
          hasChunks: data.hasChunks,
        });

        setDocumentContent(data.content || "");
        setContentSource(data.contentSource || "api");

        console.log("Document content loaded successfully:", {
          contentLength: data.contentLength,
          contentSource: data.contentSource,
          hasChunks: data.hasChunks,
        });
      } else {
        console.error("API returned success: false", data);
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

  const handleACLChange = async (newACL: Document["acl"]) => {
    try {
      setIsUpdatingACL(true);
      console.log("Updating ACL for document:", document.id, "to:", newACL);

      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: { acl: newACL },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update document ACL");
      }

      toast({
        title: "Access level updated",
        description: `Document access changed to ${newACL}`,
      });

      console.log("Document ACL updated successfully:", document.id);
    } catch (error) {
      console.error("Error updating document ACL:", error);
      toast({
        title: "Error updating access level",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update access level",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingACL(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      console.log("Downloading document:", document.title);

      // Check if we're in a browser environment
      if (typeof window === "undefined") {
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

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = document.title;
      link.style.display = "none";

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `${document.title} is being downloaded`,
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download document",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    console.log("Opening share modal for:", document.id);
    setShareModalOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/app?document=${document.id}`;
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: "Link copied",
        description: "Document link copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying link:", error);
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
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

    // Check if this is a PDF with page data for visual display
    if (
      document.title.endsWith(".pdf") &&
      document.pageData &&
      document.pageData.length > 0 &&
      viewMode === "pdf"
    ) {
      return (
        <div className="h-full">
          <PDFViewer
            pages={document.pageData.map((page) => ({
              pageNumber: page.pageNumber,
              imageData: page.imageData,
            }))}
            title={document.title}
          />
        </div>
      );
    }

    // Fallback to text rendering for non-PDF documents or PDFs without page data
    return (
      <div className="prose prose-sm max-w-none">
        {documentContent.split("\n\n").map((paragraph, index) => {
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
          } else if (trimmedParagraph.startsWith("- ") || trimmedParagraph.startsWith("• ")) {
            // Handle bullet points
            return (
              <ul key={index} className="list-disc list-inside mb-4 space-y-1">
                {trimmedParagraph.split(/\n(?=- |• )/).map((item, itemIndex) => (
                  <li key={itemIndex} className="text-foreground/80 leading-relaxed">
                    {item.replace(/^[-•] /, "")}
                  </li>
                ))}
              </ul>
            );
          } else if (trimmedParagraph.match(/^\d+\. /)) {
            // Handle numbered lists
            const number = trimmedParagraph.match(/^(\d+)\. /)?.[1];
            const text = trimmedParagraph.replace(/^\d+\. /, "");
            return (
              <div key={index} className="flex items-start mb-4 ml-6">
                <span className="w-6 h-6 bg-primary/20 text-primary text-sm font-medium rounded-full flex items-center justify-center mt-1 mr-3 flex-shrink-0">
                  {number}
                </span>
                <p className="text-foreground/80 leading-relaxed">{text}</p>
              </div>
            );
          } else {
            // Regular paragraph
            return (
              <p key={index} className="text-foreground/80 leading-relaxed mb-4">
                {trimmedParagraph}
              </p>
            );
          }
        })}
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
                  <span className="text-xs text-muted-foreground">•</span>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{document.owner}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            <Select
              value={document.acl}
              onValueChange={handleACLChange}
              disabled={isUpdatingACL}
            >
              <SelectTrigger className="h-8 px-2 sm:px-3 w-auto">
                <div className="flex items-center space-x-1">
                  <Icon className="h-3 w-3" />
                  <span className="text-xs sm:text-sm">{aclInfo.label}</span>
                  {isUpdatingACL && (
                    <Loader2 className="h-3 w-3 animate-spin ml-1" />
                  )}
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Private</span>
                  </div>
                </SelectItem>
                <SelectItem value="workspace">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Workspace</span>
                  </div>
                </SelectItem>
                <SelectItem value="organization">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Organization</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:px-3"
                >
              <Share className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Document Link</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="text"
                        value={`${window.location.origin}/app?document=${document.id}`}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Access level:{" "}
                      <span className="font-medium">{aclInfo.label}</span>
                    </p>
                    <p className="mt-1">{aclInfo.description}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-8 px-2 sm:px-3"
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 animate-spin" />
              ) : (
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {isDownloading ? "Downloading..." : "Download"}
              </span>
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
            
            {/* PDF View Mode Toggle */}
            {document.title.endsWith(".pdf") && document.pageData && document.pageData.length > 0 && (
              <div className="flex justify-center mb-4">
                <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={viewMode === "text" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("text")}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Text
                  </Button>
                  <Button
                    variant={viewMode === "pdf" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("pdf")}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    PDF View
                  </Button>
                </div>
              </div>
            )}
            
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
                          Owner
                        </label>
                        <p className="text-sm text-foreground">
                          {document.owner}
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

                    {/* PDF Metadata Section */}
                    {document.metadata && (
                      <div className="mt-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">PDF Metadata</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {document.metadata.author && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                PDF Author
                              </label>
                              <p className="text-sm text-foreground">
                                {document.metadata.author}
                              </p>
                            </div>
                          )}
                          {document.metadata.title && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                PDF Title
                              </label>
                              <p className="text-sm text-foreground">
                                {document.metadata.title}
                              </p>
                            </div>
                          )}
                          {document.metadata.subject && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Subject
                              </label>
                              <p className="text-sm text-foreground">
                                {document.metadata.subject}
                              </p>
                            </div>
                          )}
                          {document.metadata.creator && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Creator
                              </label>
                              <p className="text-sm text-foreground">
                                {document.metadata.creator}
                              </p>
                            </div>
                          )}
                          {document.metadata.totalPages && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Total Pages
                              </label>
                              <p className="text-sm text-foreground">
                                {document.metadata.totalPages}
                              </p>
                            </div>
                          )}
                          {document.metadata.creationDate && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Creation Date
                              </label>
                              <p className="text-sm text-foreground">
                                {new Date(
                                  document.metadata.creationDate
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
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
