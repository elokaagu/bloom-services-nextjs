"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Share,
  Copy,
  Mail,
  Users,
  Lock,
  Globe,
  Link,
  CheckCircle,
} from "lucide-react";
import { Document } from "./DocumentCard";

interface ShareModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal = ({ document, isOpen, onClose }: ShareModalProps) => {
  const [shareType, setShareType] = useState<"link" | "email" | "workspace">(
    "link"
  );
  const [emailAddresses, setEmailAddresses] = useState("");
  const [message, setMessage] = useState("");
  const [permissions, setPermissions] = useState<"read" | "comment" | "edit">(
    "read"
  );
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      if (shareType === "link") {
        setIsGeneratingLink(true);

        // Generate a shareable link (mock implementation)
        const link = `${window.location.origin}/shared/${document.id}`;
        setGeneratedLink(link);

        toast({
          title: "Share link generated",
          description: "Link copied to clipboard",
        });
      } else if (shareType === "email") {
        // Send email invitation (mock implementation)
        toast({
          title: "Invitations sent",
          description: `Sent to ${emailAddresses.split(",").length} recipients`,
        });
      } else if (shareType === "workspace") {
        // Share with workspace (mock implementation)
        toast({
          title: "Document shared",
          description: `Shared with workspace members`,
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error sharing document",
        description: "Failed to share document",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const getPermissionIcon = (perm: string) => {
    switch (perm) {
      case "read":
        return <Users className="h-4 w-4" />;
      case "comment":
        return <Mail className="h-4 w-4" />;
      case "edit":
        return <Globe className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="h-5 w-5" />
            <span>Share &quot;{document.title}&quot;</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Type Selection */}
          <div className="space-y-3">
            <Label>Share with</Label>
            <Select
              value={shareType}
              onValueChange={(value: any) => setShareType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sharing method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">
                  <div className="flex items-center space-x-2">
                    <Link className="h-4 w-4" />
                    <span>Anyone with the link</span>
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Specific people</span>
                  </div>
                </SelectItem>
                <SelectItem value="workspace">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Workspace members</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Input */}
          {shareType === "email" && (
            <div className="space-y-3">
              <Label htmlFor="emails">Email addresses</Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses separated by commas"
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Message */}
          {(shareType === "email" || shareType === "workspace") && (
            <div className="space-y-3">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a message to your invitation"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Permissions</Label>
            <Select
              value={permissions}
              onValueChange={(value: any) => setPermissions(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select permissions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>View only</span>
                  </div>
                </SelectItem>
                <SelectItem value="comment">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>View and comment</span>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>View, comment, and edit</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generated Link */}
          {generatedLink && (
            <div className="space-y-3">
              <Label>Share link</Label>
              <div className="flex items-center space-x-2">
                <Input value={generatedLink} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1"
                >
                  {linkCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{linkCopied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Document Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Document</span>
              <Badge variant="secondary">{document.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Owner: {document.owner}</div>
              <div>Uploaded: {document.uploadedAt}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isGeneratingLink}>
              {isGeneratingLink ? "Sharing..." : "Share"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
