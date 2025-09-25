'use client'

import { useState } from 'react';
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
  { id: '1', name: 'Policy Research', organization: 'Acme Corp' },
  { id: '2', name: 'Financial Reports', organization: 'Acme Corp' },
  { id: '3', name: 'HR Documentation', organization: 'Acme Corp' },
  { id: '4', name: 'Security & Compliance', organization: 'TechFlow Inc' }
];

export const BloomApp = () => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(mockWorkspaces[0]);
  const [currentPage, setCurrentPage] = useState('library');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { toast } = useToast();

  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    toast({
      title: "Workspace switched",
      description: `Now viewing ${workspace.name}`,
    });
  };

  const handleDocumentView = (document: Document) => {
    if (document.status !== 'ready') {
      toast({
        title: "Document not ready",
        description: "Please wait for the document to finish processing",
        variant: "destructive"
      });
      return;
    }

    setSelectedDocument(document);
    setCurrentPage('document-view');
  };

  const handleSourceView = (citation: Citation) => {
    toast({
      title: "Opening source",
      description: `Viewing ${citation.documentTitle}`,
    });
  };

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
    if (page !== 'document-view') {
      setSelectedDocument(null);
    }
  };

  const handleBackToLibrary = () => {
    setSelectedDocument(null);
    setCurrentPage('library');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'library':
        return <DocumentLibrary onDocumentView={handleDocumentView} />;
      case 'document-view':
        return selectedDocument ? (
          <DocumentView 
            document={selectedDocument} 
            onBack={handleBackToLibrary}
          />
        ) : <DocumentLibrary onDocumentView={handleDocumentView} />;
      case 'chat':
        return <ChatInterface onSourceView={handleSourceView} />;
      case 'admin':
        return <MemberManagement />;
      case 'analytics':
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