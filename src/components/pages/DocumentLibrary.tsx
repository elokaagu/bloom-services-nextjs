import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocumentCard, type Document } from "@/components/documents/DocumentCard";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List,
  SortAsc,
  CheckSquare,
  Square,
  Trash2,
  Lock,
  Users,
  Globe,
  FileX,
  RefreshCw
} from "lucide-react";

// Enhanced mock documents data with preview and analytics
const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Data Retention Policy 2024.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploadedAt: '2 days ago',
    status: 'ready',
    acl: 'organization',
    owner: 'Sarah Chen',
    preview: 'This document outlines the company\'s data retention policies for 2024, including guidelines for personal data handling, storage periods, and deletion procedures in compliance with GDPR and other regulations.',
    queryCount: 23,
    lastAccessed: '1 hour ago'
  },
  {
    id: '2',
    title: 'GDPR Compliance Guide.docx',
    type: 'docx',
    size: '1.8 MB',
    uploadedAt: '1 week ago',
    status: 'ready',
    acl: 'workspace',
    owner: 'John Doe',
    preview: 'A comprehensive guide to GDPR compliance covering data protection principles, lawful bases for processing, individual rights, and implementation strategies for businesses.',
    queryCount: 45,
    lastAccessed: '3 hours ago'
  },
  {
    id: '3',
    title: 'Q3 2024 Financial Report.xlsx',
    type: 'xlsx',
    size: '5.2 MB',
    uploadedAt: '3 days ago',
    status: 'ready',
    acl: 'private',
    owner: 'Emily Watson',
    preview: 'Quarterly financial statements including revenue analysis, expense breakdowns, profit margins, and key performance indicators for Q3 2024.',
    queryCount: 12,
    lastAccessed: '2 days ago'
  },
  {
    id: '4',
    title: 'Security Best Practices.pdf',
    type: 'pdf',
    size: '3.1 MB',
    uploadedAt: '5 days ago',
    status: 'ready',
    acl: 'workspace',
    owner: 'Michael Rodriguez',
    preview: 'Essential security practices for enterprise environments, covering network security, access controls, incident response, and employee training protocols.',
    queryCount: 67,
    lastAccessed: '30 minutes ago'
  },
  {
    id: '5',
    title: 'Employee Handbook 2024.docx',
    type: 'docx',
    size: '4.7 MB',
    uploadedAt: '1 day ago',
    status: 'processing',
    acl: 'organization',
    owner: 'Sarah Chen'
  },
  {
    id: '6',
    title: 'Marketing Strategy Presentation.pptx',
    type: 'pptx',
    size: '12.3 MB',
    uploadedAt: '30 minutes ago',
    status: 'uploading',
    acl: 'workspace',
    owner: 'John Doe',
    progress: 73
  },
  {
    id: '7',
    title: 'Failed Upload Document.pdf',
    type: 'pdf',
    size: '8.9 MB',
    uploadedAt: '2 hours ago',
    status: 'failed',
    acl: 'workspace',
    owner: 'Alex Thompson'
  }
];

interface DocumentLibraryProps {
  onDocumentView: (doc: Document) => void;
}

export const DocumentLibrary = ({ onDocumentView }: DocumentLibraryProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aclFilter, setAclFilter] = useState('all');
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch documents from database
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        workspaceId: 'default-workspace',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/documents?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Transform database documents to match Document interface
        const transformedDocuments: Document[] = data.documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          type: doc.title.split('.').pop()?.toLowerCase() as Document['type'] || 'pdf',
          size: 'Unknown', // We'll need to get this from storage metadata
          uploadedAt: new Date(doc.created_at).toLocaleDateString(),
          status: doc.status,
          acl: doc.acl || 'workspace',
          owner: 'Unknown', // We'll need to join with users table
          error: doc.error
        }));
        
        setDocuments(transformedDocuments);
      } else {
        throw new Error(data.error || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      // Fallback to mock data if database fails
      setDocuments(mockDocuments);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents on component mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [statusFilter, searchTerm]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesACL = aclFilter === 'all' || doc.acl === aclFilter;
    
    return matchesSearch && matchesStatus && matchesACL;
  });

  const handleUploadComplete = (files: File[]) => {
    // Refresh documents list after successful upload
    fetchDocuments();
    setIsUploadOpen(false);
  };

  const handleDocumentDelete = (doc: Document) => {
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      newSet.delete(doc.id);
      return newSet;
    });
  };

  const handleDocumentShare = (doc: Document) => {
    console.log('Sharing document:', doc);
  };

  const handleACLChange = (doc: Document, newACL: Document['acl']) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, acl: newACL } : d));
  };

  const handleDocumentSelect = (doc: Document, selected: boolean) => {
    setSelectedDocuments(prev => {
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
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  const handleBulkDelete = () => {
    setDocuments(prev => prev.filter(d => !selectedDocuments.has(d.id)));
    setSelectedDocuments(new Set());
    setShowBulkActions(false);
  };

  const handleBulkACLChange = (newACL: Document['acl']) => {
    setDocuments(prev => prev.map(d => 
      selectedDocuments.has(d.id) ? { ...d, acl: newACL } : d
    ));
    setSelectedDocuments(new Set());
    setShowBulkActions(false);
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return documents.length;
    return documents.filter(doc => doc.status === status).length;
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-8">
      {/* Header with unified top padding */}
      <div className="bg-card/50 backdrop-blur-sm -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8 py-4 border-b border-border/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Document Library</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {filteredDocuments.length} of {documents.length} documents
              {selectedDocuments.size > 0 && (
                <span className="ml-2">• {selectedDocuments.size} selected</span>
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
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            
            {selectedDocuments.size > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Bulk Actions </span>({selectedDocuments.size})
                </Button>
                {showBulkActions && (
                  <div className="hidden sm:flex items-center space-x-2">
                    <Select onValueChange={handleBulkACLChange}>
                      <SelectTrigger className="w-24 sm:w-32">
                        <SelectValue placeholder="Change ACL" />
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            
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

      {/* Mobile Bulk Actions */}
      {selectedDocuments.size > 0 && showBulkActions && (
        <div className="sm:hidden flex flex-col space-y-2 p-3 bg-muted/30 rounded-lg">
          <Select onValueChange={handleBulkACLChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Change Access Level" />
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
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Search and Filters - Single Line */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Select all checkbox */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="h-9 w-9 p-0 flex-shrink-0"
        >
          {selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0 ? (
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

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] sm:w-[160px]">
            <SortAsc className="h-4 w-4 mr-2" />
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
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="border-0 rounded-l-lg rounded-r-none h-9 w-9 p-0"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
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
            key: 'all', 
            label: 'All', 
            count: getStatusCount('all'), 
            color: 'text-foreground'
          },
          { 
            key: 'ready', 
            label: 'Ready', 
            count: getStatusCount('ready'), 
            color: 'text-success'
          },
          { 
            key: 'processing', 
            label: 'Processing', 
            count: getStatusCount('processing'), 
            color: 'text-warning'
          },
          { 
            key: 'uploading', 
            label: 'Uploading', 
            count: getStatusCount('uploading'), 
            color: 'text-blue-600'
          },
          { 
            key: 'failed', 
            label: 'Failed', 
            count: getStatusCount('failed'), 
            color: 'text-destructive'
          }
        ].map((status) => (
          <Button
            key={status.key}
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(status.key)}
            className={`px-2 sm:px-3 py-2 rounded-none border-b-2 transition-colors whitespace-nowrap flex-shrink-0 text-xs sm:text-sm ${
              statusFilter === status.key
                ? 'border-primary bg-muted/50 text-primary'
                : 'border-transparent hover:bg-muted/30'
            }`}
          >
            <span className="flex items-center space-x-1 sm:space-x-2">
              <span className={statusFilter === status.key ? 'font-medium' : ''}>
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
          <p className="text-muted-foreground mb-4 text-sm sm:text-base max-w-md mx-auto">
            Showing mock data for now. Please check your Supabase configuration.
          </p>
          <Button onClick={fetchDocuments} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Documents Grid/List */}
      {!isLoading && !error && filteredDocuments.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            : "space-y-2"
        }>
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onView={onDocumentView}
              onDelete={handleDocumentDelete}
              onShare={handleDocumentShare}
              onACLChange={handleACLChange}
              isSelected={selectedDocuments.has(document.id)}
              onSelect={handleDocumentSelect}
              showSelection={true}
            />
          ))}
        </div>
      ) : !isLoading && !error ? (
        <div className="text-center py-8 sm:py-12 px-4">
          {/* Status-specific empty states */}
          {statusFilter === 'failed' && getStatusCount('failed') === 0 ? (
            <div className="mb-4">
              <div className="text-4xl sm:text-6xl mb-2">🎉</div>
            </div>
          ) : statusFilter === 'ready' && getStatusCount('ready') > 0 ? (
            <div className="mb-4">
              <div className="text-4xl sm:text-6xl mb-2">✨</div>
            </div>
          ) : (
            <div className="mb-4">
              {searchTerm ? <Search className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto" /> : <FileX className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto" />}
            </div>
          )}
          
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
            {statusFilter === 'failed' && getStatusCount('failed') === 0 
              ? 'No failed uploads!' 
              : statusFilter === 'ready' && getStatusCount('ready') > 0
              ? 'All documents ready!'
              : searchTerm 
              ? 'No documents found' 
              : 'No documents yet'
            }
          </h3>
          
          <p className="text-muted-foreground mb-4 text-sm sm:text-base max-w-md mx-auto">
            {statusFilter === 'failed' && getStatusCount('failed') === 0
              ? 'Great job! All your uploads completed successfully. Keep up the good work!'
              : statusFilter === 'ready' && getStatusCount('ready') > 0
              ? 'Your documents are processed and ready to use. Start exploring your knowledge base!'
              : searchTerm 
              ? 'Try adjusting your search terms or filters to find what you\'re looking for' 
              : 'Upload your first document to start building your knowledge base'
            }
          </p>
          
          {!searchTerm && statusFilter !== 'ready' && (
            <Button onClick={() => setIsUploadOpen(true)} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};