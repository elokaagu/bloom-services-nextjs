import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { UploadDropzone } from "@/components/upload/UploadDropzoneNew";
import { ShareModal } from "@/components/documents/ShareModal";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  Trash2,
  Lock,
  Users,
  Globe,
  FileX,
  RefreshCw,
  Eye,
  FileText,
  Download,
  Share,
  MoreVertical,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

// Enhanced Document interface with preview support
interface Document {
  id: string;
  title: string;
  type: "pdf" | "docx" | "txt" | "xlsx" | "pptx" | "other";
  size: string;
  uploadedAt: string;
  status: "ready" | "processing" | "uploading" | "failed";
  acl: "private" | "workspace" | "organization";
  owner: string;
  summary?: string;
  summaryUpdatedAt?: string;
  error?: string;
  preview?: {
    content: string;
    type: string;
    source: string;
    truncated: boolean;
  };
}

interface DocumentLibraryProps {
  onDocumentView: (doc: Document) => void;
}

const getStatusIcon = (status: Document["status"]) => {
  switch (status) {
    case "ready":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "processing":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "uploading":
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getACLIcon = (acl: Document["acl"]) => {
  switch (acl) {
    case "private":
      return <Lock className="h-3 w-3" />;
    case "workspace":
      return <Users className="h-3 w-3" />;
    case "organization":
      return <Globe className="h-3 w-3" />;
  }
};

const getACLColor = (acl: Document["acl"]) => {
  switch (acl) {
    case "private":
      return "text-gray-600 bg-gray-100";
    case "workspace":
      return "text-blue-600 bg-blue-100";
    case "organization":
      return "text-green-600 bg-green-100";
  }
};

export const DocumentLibrary = ({ onDocumentView }: DocumentLibraryProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [aclFilter, setAclFilter] = useState("all");
  const [sortBy, setSortBy] = useState("uploadedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(
    new Set()
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [documentToShare, setDocumentToShare] = useState<Document | null>(null);
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(
    new Set()
  );
  const { toast } = useToast();

  // Fetch documents from database
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        workspaceId: "550e8400-e29b-41d4-a716-446655440001",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/documents-supabase?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const transformedDocuments: Document[] = data.documents.map(
          (doc: any) => ({
            id: doc.id,
            title: doc.title,
            type:
              (doc.title.split(".").pop()?.toLowerCase() as Document["type"]) ||
              "pdf",
            size: doc.fileSize || "Size not available",
            uploadedAt: new Date(doc.created_at).toLocaleDateString(),
            status: doc.status,
            acl: doc.acl || "workspace",
            owner: doc.users?.name || doc.users?.email || "Unknown User",
            error: doc.error,
            summary: doc.summary,
            summaryUpdatedAt: doc.summary_updated_at,
          })
        );

        setDocuments(transformedDocuments);
      } else {
        throw new Error(data.error || "Failed to fetch documents");
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch documents"
      );
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  // Fetch document preview
  const fetchDocumentPreview = useCallback(async (documentId: string) => {
    try {
      setLoadingPreviews((prev) => new Set(prev).add(documentId));

      const response = await fetch(
        `/api/documents/preview?documentId=${documentId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  size: data.document.fileSize,
                  preview: data.preview,
                }
              : doc
          )
        );
      }
    } catch (error) {
      console.error("Error fetching document preview:", error);
    } finally {
      setLoadingPreviews((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  }, []);

  // Fetch documents on component mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-fetch previews for ready documents
  useEffect(() => {
    documents.forEach((doc) => {
      if (
        doc.status === "ready" &&
        !doc.preview &&
        !loadingPreviews.has(doc.id)
      ) {
        fetchDocumentPreview(doc.id);
      }
    });
  }, [documents, fetchDocumentPreview, loadingPreviews]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.preview?.content &&
        doc.preview.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesACL = aclFilter === "all" || doc.acl === aclFilter;

    return matchesSearch && matchesStatus && matchesACL;
  });

  // Sort the filtered documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "uploadedAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "size":
        comparison = (a.fileSize || 0) - (b.fileSize || 0);
        break;
      case "owner":
        comparison = a.owner.localeCompare(b.owner);
        break;
      default:
        return 0;
    }
    
    return sortDirection === "desc" ? -comparison : comparison;
  });

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same sort field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new sort field with default direction
      setSortBy(newSortBy);
      setSortDirection("desc");
    }
  };

  const handleDocumentDelete = async (doc: Document) => {
    try {
      setDeletingDocuments((prev) => new Set(prev).add(doc.id));

      const response = await fetch(`/api/documents/${doc.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete document");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setSelectedDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });

      toast({
        title: "Document deleted",
        description: `${doc.title} has been deleted successfully`,
      });

      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error deleting document",
        description:
          error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeletingDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  const handleDocumentShare = async (doc: Document) => {
    setDocumentToShare(doc);
    setShareModalOpen(true);
  };

  const generateSummary = async (doc: Document) => {
    try {
      const response = await fetch("/api/documents/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const result = await response.json();

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                summary: result.summary,
                summaryUpdatedAt: new Date().toISOString(),
              }
            : d
        )
      );

      toast({
        title: "Summary generated",
        description: `Summary created for ${doc.title}`,
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error generating summary",
        description:
          error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
    }
  };

  const handleACLChange = async (doc: Document, newACL: Document["acl"]) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { acl: newACL } }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update document ACL");
      }

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, acl: newACL } : d))
      );
    } catch (error) {
      console.error("Error updating document ACL:", error);
    }
  };

  const handleDocumentSelect = (doc: Document, selected: boolean) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(doc.id);
      } else {
        newSet.delete(doc.id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === sortedDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(sortedDocuments.map((d) => d.id)));
    }
  };

  const handleBulkDelete = () => {
    setDocuments((prev) => prev.filter((d) => !selectedDocuments.has(d.id)));
    setSelectedDocuments(new Set());
    setShowBulkActions(false);
  };

  const handleBulkACLChange = (newACL: Document["acl"]) => {
    setDocuments((prev) =>
      prev.map((d) => (selectedDocuments.has(d.id) ? { ...d, acl: newACL } : d))
    );
    setSelectedDocuments(new Set());
    setShowBulkActions(false);
  };

  const getStatusCount = (status: string) => {
    if (status === "all") return documents.length;
    return documents.filter((doc) => doc.status === status).length;
  };

  const renderDocumentCard = (document: Document) => {
    const isSelected = selectedDocuments.has(document.id);
    const isDeleting = deletingDocuments.has(document.id);
    const isLoadingPreview = loadingPreviews.has(document.id);

    return (
      <Card
        key={document.id}
        className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
          isSelected ? "ring-2 ring-primary bg-primary/5" : ""
        } ${isDeleting ? "opacity-50" : ""}`}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDocumentSelect(document, !isSelected);
            }}
            className="h-6 w-6 p-0 hover:bg-background/80"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-3 right-3 z-10">
          {getStatusIcon(document.status)}
        </div>

        <div className="p-4 pt-8">
          {/* Document Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold text-sm truncate">
                {document.title}
              </h3>
            </div>
          </div>

          {/* Document Preview */}
          <div className="mb-3">
            {isLoadingPreview ? (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading preview...</span>
              </div>
            ) : document.preview ? (
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="line-clamp-3">{document.preview.content}</p>
                {document.preview.truncated && (
                  <span className="text-primary">...read more</span>
                )}
              </div>
            ) : document.summary ? (
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="line-clamp-3">{document.summary}</p>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {document.status === "ready"
                  ? "Content preview loading..."
                  : "Preview not available"}
              </div>
            )}
          </div>

          {/* Document Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center space-x-2">
              <span>{document.size}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{document.uploadedAt}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className={`text-xs ${getACLColor(document.acl)}`}
              >
                {getACLIcon(document.acl)}
                <span className="ml-1 capitalize">{document.acl}</span>
              </Badge>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDocumentShare(document);
                }}
                className="h-7 w-7 p-0"
              >
                <Share className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDocumentView(document);
                }}
                className="h-7 w-7 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDocumentDelete(document);
                }}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-8">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8 py-4 border-b border-border/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              Document Library
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {sortedDocuments.length} of {documents.length} documents
              {selectedDocuments.size > 0 && (
                <span className="ml-2">
                  • {selectedDocuments.size} selected
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Upload Documents</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-2 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Upload Documents</DialogTitle>
                </DialogHeader>
                <UploadDropzone onUploadComplete={handleUploadComplete} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="h-9 w-9 p-0 flex-shrink-0"
        >
          {selectedDocuments.size === sortedDocuments.length &&
          sortedDocuments.length > 0 ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        <Select value={aclFilter} onValueChange={setAclFilter}>
          <SelectTrigger className="w-[120px] sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Access</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="workspace">Workspace</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[140px] sm:w-[160px]">
            {sortDirection === "desc" ? (
              <SortDesc className="h-4 w-4 mr-2" />
            ) : (
              <SortAsc className="h-4 w-4 mr-2" />
            )}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uploadedAt">Recently Uploaded</SelectItem>
            <SelectItem value="title">Name A-Z</SelectItem>
            <SelectItem value="size">File Size</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-lg flex-shrink-0">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="border-0 rounded-l-lg rounded-r-none h-9 w-9 p-0"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="border-0 rounded-r-lg rounded-l-none h-9 w-9 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-0 border-b overflow-x-auto pb-0">
        {[
          {
            key: "all",
            label: "All",
            count: getStatusCount("all"),
            color: "text-foreground",
          },
          {
            key: "ready",
            label: "Ready",
            count: getStatusCount("ready"),
            color: "text-success",
          },
          {
            key: "processing",
            label: "Processing",
            count: getStatusCount("processing"),
            color: "text-warning",
          },
          {
            key: "uploading",
            label: "Uploading",
            count: getStatusCount("uploading"),
            color: "text-blue-600",
          },
          {
            key: "failed",
            label: "Failed",
            count: getStatusCount("failed"),
            color: "text-destructive",
          },
        ].map((status) => (
          <Button
            key={status.key}
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(status.key)}
            className={`px-2 sm:px-3 py-2 rounded-none border-b-2 transition-colors whitespace-nowrap flex-shrink-0 text-xs sm:text-sm ${
              statusFilter === status.key
                ? "border-primary bg-muted/50 text-primary"
                : "border-transparent hover:bg-muted/30"
            }`}
          >
            <span className="flex items-center space-x-1 sm:space-x-2">
              <span
                className={statusFilter === status.key ? "font-medium" : ""}
              >
                {status.label}
              </span>
              <span className="text-xs font-medium text-muted-foreground ml-1">
                {status.count}
              </span>
            </span>
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 sm:py-12 px-4">
          <RefreshCw className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto animate-spin mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
            Loading documents...
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            Fetching your documents from the database
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="text-4xl sm:text-6xl mb-4">⚠️</div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
            Database Connection Error
          </h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base max-w-md mx-auto">
            {error}
          </p>
          <Button onClick={fetchDocuments} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Documents Grid */}
      {!isLoading && !error && sortedDocuments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedDocuments.map(renderDocumentCard)}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && sortedDocuments.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="mb-4">
            <FileX className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
            {searchTerm ? "No documents found" : "No documents yet"}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base max-w-md mx-auto">
            {searchTerm
              ? "Try adjusting your search terms or filters to find what you're looking for"
              : "Upload your first document to start building your knowledge base"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsUploadOpen(true)} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          )}
        </div>
      )}

      {/* Share Modal */}
      {documentToShare && (
        <ShareModal
          document={documentToShare}
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setDocumentToShare(null);
          }}
        />
      )}
    </div>
  );
};
