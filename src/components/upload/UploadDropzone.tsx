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
  onUploadComplete: (files: File[]) => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  workspaceId?: string;
  ownerId?: string;
}

export const UploadDropzone = ({
  onUploadComplete,
  maxSize = 50,
  acceptedTypes = [".pdf", ".docx", ".pptx", ".txt", ".xlsx"],
  workspaceId = "default-workspace",
  ownerId = "default-user",
}: UploadDropzoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        handleFiles(files);
      }
    },
    []
  );

  const handleFiles = (files: File[]) => {
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

    // Start upload for valid files
    validatedFiles.forEach((uploadFileItem) => {
      if (uploadFileItem.status === "pending") {
        uploadFile(uploadFileItem.id);
      }
    });
  };

  const uploadFile = async (fileId: string) => {
    const uploadFile = uploadFiles.find((f) => f.id === fileId);
    if (!uploadFile) return;

    setUploadFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "uploading", progress: 10 } : f
      )
    );

    try {
      // Upload file to Supabase
      const formData = new FormData();
      formData.append("file", uploadFile.file);
      formData.append("workspaceId", workspaceId);
      formData.append("ownerId", ownerId);
      formData.append("title", uploadFile.file.name);

      setUploadFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 50 } : f))
      );

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { document } = await uploadResponse.json();

      setUploadFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 75 } : f))
      );

      // Trigger ingestion
      const ingestResponse = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      if (!ingestResponse.ok) {
        throw new Error("Ingestion failed");
      }

      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: 100, status: "success" } : f
        )
      );

      // Notify parent component
      onUploadComplete([uploadFile.file]);
    } catch (error) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return <FileText className="h-4 w-4" />;
  };

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "uploading":
        return <File className="h-4 w-4 text-primary animate-pulse" />;
      case "pending":
        return <File className="h-4 w-4 text-muted-foreground" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
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
                  {getFileIcon(uploadFile.file.name)}
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
                    <p className="text-xs text-destructive">
                      {uploadFile.error}
                    </p>
                  )}

                  {uploadFile.status === "success" && (
                    <div className="flex items-center space-x-1">
                      <Badge className="text-xs bg-primary text-primary-foreground">
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
