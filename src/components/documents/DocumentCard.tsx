import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  MoreHorizontal,
  Download,
  Share,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Eye,
  Users,
  Lock,
  Globe,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Document {
  id: string;
  title: string;
  type: "pdf" | "docx" | "pptx" | "txt" | "xlsx";
  size: string;
  uploadedAt: string;
  status: "uploading" | "processing" | "ready" | "failed";
  acl: "private" | "workspace" | "organization";
  owner: string;
  progress?: number;
  preview?: string;
  queryCount?: number;
  lastAccessed?: string;
  tags?: string[];
}

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onACLChange?: (doc: Document, newACL: Document["acl"]) => void;
  isSelected?: boolean;
  onSelect?: (doc: Document, selected: boolean) => void;
  showSelection?: boolean;
}

const getFileIcon = (type: string, className = "h-5 w-5") => {
  // Icons removed as requested
  return null;
};

const getStatusBadge = (status: Document["status"], progress?: number) => {
  switch (status) {
    case "uploading":
      return (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Uploading {progress}%</span>
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Processing</span>
        </Badge>
      );
    case "ready":
      return (
        <Badge className="flex items-center space-x-1 bg-primary text-primary-foreground">
          <span>Ready</span>
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Failed</span>
        </Badge>
      );
  }
};

const getACLBadge = (acl: Document["acl"], onClick?: () => void) => {
  const variants = {
    private: {
      label: "Private",
      icon: Lock,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    },
    workspace: {
      label: "Workspace",
      icon: Users,
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    },
    organization: {
      label: "Organization",
      icon: Globe,
      className: "bg-green-100 text-green-800 hover:bg-green-200",
    },
  };

  const variant = variants[acl];
  const Icon = variant.icon;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs flex items-center space-x-1 transition-colors",
        variant.className,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <Icon className="h-3 w-3" />
      <span>{variant.label}</span>
    </Badge>
  );
};

export const DocumentCard = ({
  document,
  onView,
  onDelete,
  onShare,
  onACLChange,
  isSelected,
  onSelect,
  showSelection,
}: DocumentCardProps) => {
  const isClickable = document.status === "ready";

  const handleCardClick = () => {
    if (isClickable) {
      onView(document);
    }
  };

  const handleACLChange = (newACL: Document["acl"]) => {
    onACLChange?.(document, newACL);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Mock retry logic
    console.log("Retrying upload for:", document.title);
  };

  const cardContent = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-md border-border/50",
        isClickable && "cursor-pointer hover:shadow-lg",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div className="p-4" onClick={handleCardClick}>
        {/* Selection checkbox */}
        {showSelection && (
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(document, !!checked)}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border-2"
            />
          </div>
        )}

        {/* Header with actions */}
        <div
          className={cn(
            "flex items-start justify-between",
            showSelection && "ml-8"
          )}
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {document.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {document.size}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {document.uploadedAt}
              </span>
              {document.lastAccessed && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {document.lastAccessed}
                  </span>
                </>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(document)}>
                <Download className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(document)}>
                <Share className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              {document.status === "failed" && (
                <DropdownMenuItem onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Upload
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(document)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status, ACL, and analytics */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            {getStatusBadge(document.status, document.progress)}

            {/* Quick ACL editor */}
            {onACLChange ? (
              <Select value={document.acl} onValueChange={handleACLChange}>
                <SelectTrigger
                  className="w-auto h-auto p-0 border-0 bg-transparent hover:bg-muted/50 rounded-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getACLBadge(document.acl)}
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
            ) : (
              getACLBadge(document.acl)
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            by {document.owner}
          </span>
        </div>

        {/* Analytics teaser */}
        {document.queryCount !== undefined && document.status === "ready" && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{document.queryCount} queries answered</span>
            </div>
            {/* Mock sparkline */}
            <div className="flex items-end space-x-0.5">
              {[3, 7, 2, 8, 5, 9, 4].map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary/60 rounded-sm"
                  style={{ height: `${height * 2}px` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Progress bar for uploading documents */}
        {document.status === "uploading" && document.progress && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${document.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed state with retry button */}
        {document.status === "failed" && (
          <div className="mt-3 p-2 bg-destructive/10 rounded-md border border-destructive/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-destructive">Upload failed</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                className="h-6 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  // Wrap with hover card for preview
  if (document.preview && document.status === "ready") {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>{cardContent}</HoverCardTrigger>
        <HoverCardContent className="w-80" side="right">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{document.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-4">
              {document.preview}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">Preview</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(document)}
              >
                Open Document
              </Button>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return cardContent;
};
