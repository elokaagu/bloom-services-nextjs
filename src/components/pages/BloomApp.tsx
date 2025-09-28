"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DocumentLibrary } from "./DocumentLibrary";
import { DocumentView } from "./DocumentView";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { MemberManagement } from "@/components/admin/MemberManagement";
import { Analytics } from "./Analytics";
import { Document } from "@/components/documents/DocumentCard";
import { Citation } from "@/components/chat/ChatInterface";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface Workspace {
  id: string;
  name: string;
  organization: string;
}

const mockWorkspaces: Workspace[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Policy Research",
    organization: "Acme Corp",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Financial Reports",
    organization: "Acme Corp",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "HR Documentation",
    organization: "Acme Corp",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Security & Compliance",
    organization: "TechFlow Inc",
  },
];

export const BloomApp = () => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(
    mockWorkspaces[0]
  );
  const [currentPage, setCurrentPage] = useState("library");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const { toast } = useToast();

  // Fetch documents from database
  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        workspaceId: "550e8400-e29b-41d4-a716-446655440001",
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
      setDocuments([]);
    }
  }, []);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    toast({
      title: "Workspace switched",
      description: `Now viewing ${workspace.name}`,
    });
  };

  const handleDocumentView = async (document: Document) => {
    if (document.status !== "ready") {
      toast({
        title: "Document not ready",
        description: "Please wait for the document to finish processing",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Viewing document:", document.id);

      // Fetch document details from API
      const response = await fetch(
        `/api/documents/view?documentId=${document.id}`
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error cases
        if (response.status === 404) {
          toast({
            title: "Document not found",
            description: "This document may have been deleted or moved",
            variant: "destructive",
          });
          return; // Don't proceed to view
        }

        throw new Error(errorData.error || "Failed to fetch document");
      }

      const result = await response.json();
      console.log("Document fetched for view:", result);

      // Show success toast
      toast({
        title: "Document opened",
        description: `Viewing ${document.title}`,
      });

      setSelectedDocument(document);
      setCurrentPage("document-view");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast({
        title: "Error opening document",
        description:
          error instanceof Error ? error.message : "Failed to open document",
        variant: "destructive",
      });
    }
  };

  const handleSourceView = async (citation: Citation) => {
    try {
      console.log("Opening source document:", citation.documentId);
      
      // Find the document in the current workspace's documents
      let document = documents.find(doc => doc.id === citation.documentId);
      
      // If not found by ID, try to find by title
      if (!document && citation.documentTitle) {
        document = documents.find(doc => doc.title === citation.documentTitle);
      }
      
      // If still not found, use the first available document
      if (!document && documents.length > 0) {
        document = documents[0];
      }
      
      if (!document) {
        toast({
          title: "Document not found",
          description: "This document may have been deleted or moved",
          variant: "destructive",
        });
        return;
      }
      
      // Use the existing handleDocumentView function to open the document
      await handleDocumentView(document);
      
    } catch (error) {
      console.error("Error opening source document:", error);
      toast({
        title: "Error opening document",
        description: "Failed to open the source document",
        variant: "destructive",
      });
    }
  };

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
    if (page !== "document-view") {
      setSelectedDocument(null);
    }
  };

  const handleBackToLibrary = () => {
    setSelectedDocument(null);
    setCurrentPage("library");
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "library":
        return <DocumentLibrary onDocumentView={handleDocumentView} />;
      case "document-view":
        return selectedDocument ? (
          <DocumentView
            document={selectedDocument}
            onBack={handleBackToLibrary}
          />
        ) : (
          <DocumentLibrary onDocumentView={handleDocumentView} />
        );
      case "chat":
        return (
          <ChatInterface
            onSourceView={handleSourceView}
            workspaceId={currentWorkspace.id}
            userId="550e8400-e29b-41d4-a716-446655440002" // John Doe user UUID
          />
        );
      case "admin":
        return <MemberManagement />;
      case "analytics":
        return <Analytics />;
      default:
        return <DocumentLibrary onDocumentView={handleDocumentView} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/30 to-primary-light/50">
        <AppSidebar
          currentWorkspace={currentWorkspace}
          workspaces={mockWorkspaces}
          onWorkspaceChange={handleWorkspaceChange}
          onNavigate={handleNavigation}
          currentPage={currentPage}
        />

        <SidebarInset className="flex-1 min-w-0 ml-3">
          <main className="flex-1 py-4 sm:py-8 px-2 sm:px-0">
            {renderCurrentPage()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
