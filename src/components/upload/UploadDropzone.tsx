"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadDropzoneProps {
  onUploadComplete?: (files: File[]) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  workspaceId?: string;
  ownerId?: string;
}

export const UploadDropzone = ({
  onUploadComplete,
  maxSize = 100,
  acceptedTypes = [".pdf", ".docx", ".pptx", ".txt", ".xlsx"],
  workspaceId = "550e8400-e29b-41d4-a716-446655440001", // Policy Research workspace UUID
  ownerId = "550e8400-e29b-41d4-a716-446655440002", // Eloka Agu user UUID
}: UploadDropzoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const uploadFile = useCallback(
    async (fileId: string, file: File) => {
      console.log("=== STARTING UPLOAD ===", file.name);

      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);
        formData.append("ownerId", ownerId);
        formData.append("title", file.name);

        setUploadFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 50 } : f))
        );

        console.log("=== SENDING REQUEST ===");
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        console.log("=== RESPONSE RECEIVED ===", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Upload failed:", errorData);
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();
        console.log("=== UPLOAD SUCCESS ===", result);

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: 100, status: "success" } : f
          )
        );

        onUploadComplete?.([file]);
      } catch (error) {
        console.error("=== UPLOAD ERROR ===", error);
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    },
    [workspaceId, ownerId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      console.log("=== HANDLING FILES ===", files.length);

      const newUploadFiles: UploadFile[] = files.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: "pending",
      }));

      // Validate files
      const validatedFiles = newUploadFiles.map((uploadFile) => {
        const file = uploadFile.file;
        const sizeInMB = file.size / (1024 * 1024);
        const extension = "." + file.name.split(".").pop()?.toLowerCase();

        if (sizeInMB > maxSize) {
          return {
            ...uploadFile,
            status: "error" as const,
            error: `File size exceeds ${maxSize}MB`,
          };
        }

        if (!acceptedTypes.includes(extension)) {
          return {
            ...uploadFile,
            status: "error" as const,
            error: "File type not supported",
          };
        }

        return uploadFile;
      });

      setUploadFiles((prev) => [...prev, ...validatedFiles]);

      // Start upload for valid files immediately
      validatedFiles.forEach((uploadFileItem) => {
        if (uploadFileItem.status === "pending") {
          uploadFile(uploadFileItem.id, uploadFileItem.file);
        }
      });
    },
    [maxSize, acceptedTypes, uploadFile]
  );

  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
        return <File className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors duration-200",
          isDragOver ? "border-primary bg-accent" : "border-border",
          "hover:border-primary/50"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <div className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Drop files here or click to browse
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Support for PDF, DOCX, PPTX, TXT, XLSX files up to {maxSize}MB
          </p>
          <input
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose Files
            </label>
          </Button>
        </div>
      </Card>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Uploading {uploadFiles.length} file(s)
          </h4>
          <div className="space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {uploadFile.file.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(uploadFile.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {uploadFile.status === "pending" && (
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs">
                        Ready to upload
                      </Badge>
                    </div>
                  )}

                  {uploadFile.status === "uploading" && (
                    <div className="space-y-1">
                      <Progress value={uploadFile.progress} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {Math.round(uploadFile.progress)}%
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Processing...
                        </Badge>
                      </div>
                    </div>
                  )}

                  {uploadFile.status === "error" && uploadFile.error && (
                    <p className="text-xs text-red-500">{uploadFile.error}</p>
                  )}

                  {uploadFile.status === "success" && (
                    <div className="flex items-center space-x-1">
                      <Badge className="text-xs bg-green-500 text-white">
                        Upload complete
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
