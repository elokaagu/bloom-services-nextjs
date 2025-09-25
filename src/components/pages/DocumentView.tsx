import { useState } from 'react';
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
  FileIcon
} from "lucide-react";
import { Document } from "@/components/documents/DocumentCard";

interface DocumentViewProps {
  document: Document;
  onBack: () => void;
}

// Mock document content for demonstration
const getMockContent = (document: Document): string => {
  switch (document.id) {
    case '1':
      return `# Data Retention Policy 2024

## Overview
This document outlines the company's comprehensive data retention policies for 2024, ensuring compliance with GDPR, CCPA, and other applicable data protection regulations.

## Key Principles
1. <strong>Data Minimization</strong>: We collect only the data necessary for specific business purposes
2. <strong>Transparency</strong>: Clear communication about data collection and usage
3. <strong>Security</strong>: Robust protection measures for all stored data
4. <strong>Accountability</strong>: Regular audits and compliance monitoring

## Retention Periods
- **Personal Data**: 3 years after last interaction
- **Financial Records**: 7 years as required by law
- **Marketing Data**: 2 years or until consent withdrawal
- **Employee Records**: 7 years after employment termination

## Implementation Guidelines
All departments must adhere to these retention schedules and implement appropriate technical and organizational measures to ensure compliance.

## Contact Information
For questions about this policy, contact the Data Protection Officer at dpo@company.com`;

    case '2':
      return `# GDPR Compliance Guide

## Introduction
The General Data Protection Regulation (GDPR) represents one of the most significant changes to data protection law in decades. This guide provides practical steps for ensuring compliance.

## Key Requirements
### Lawful Basis for Processing
- Consent
- Contract
- Legal obligation
- Vital interests
- Public task
- Legitimate interests

### Individual Rights
1. **Right to be informed**
2. **Right of access**
3. **Right to rectification**
4. **Right to erasure**
5. **Right to restrict processing**
6. **Right to data portability**
7. **Right to object**
8. **Rights related to automated decision making**

## Implementation Strategy
Organizations must conduct privacy impact assessments, implement privacy by design principles, and maintain detailed records of processing activities.`;

    default:
      return `# ${document.title}

This is a preview of the document content. The full document contains detailed information about ${document.title.toLowerCase().replace(/\.[^/.]+$/, "")}.

## Document Summary
- File Type: ${document.type.toUpperCase()}
- Summary: ${document.summary ? document.summary.split('\n')[0] : 'No summary available yet'}
- Owner: ${document.owner}
- Last Accessed: ${document.lastAccessed || 'Never'}

## Content Preview
${document.summary ? document.summary : 'This document is currently being processed and will be available for full viewing shortly. Please check back later for the complete content.'}`;
  }
};

const getACLInfo = (acl: Document['acl']) => {
  const variants = {
    private: { 
      label: 'Private', 
      icon: Lock,
      description: 'Only you can access this document',
      className: 'text-gray-600'
    },
    workspace: { 
      label: 'Workspace', 
      icon: Users,
      description: 'Accessible to all workspace members',
      className: 'text-blue-600'
    },
    organization: { 
      label: 'Organization', 
      icon: Globe,
      description: 'Accessible to all organization members',
      className: 'text-green-600'
    }
  };
  
  return variants[acl];
};

export const DocumentView = ({ document, onBack }: DocumentViewProps) => {
  const [activeTab, setActiveTab] = useState("content");
  const aclInfo = getACLInfo(document.acl);
  const Icon = aclInfo.icon;

  const handleDownload = () => {
    console.log('Downloading document:', document.title);
  };

  const handleShare = () => {
    console.log('Sharing document:', document.title);
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
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{document.title}</h1>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>{document.summary ? document.summary.split('\n')[0] : document.size}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Uploaded {document.uploadedAt}</span>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{document.owner}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            <Badge variant="outline" className={`${aclInfo.className} text-xs`}>
              <Icon className="h-3 w-3 mr-1" />
              {aclInfo.label}
            </Badge>
            
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8 px-2 sm:px-3">
              <Share className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 px-2 sm:px-3">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-6 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="content" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Document Content</span>
                <span className="sm:hidden">Content</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="metadata" className="text-xs sm:text-sm">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="flex-1 mt-0">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 h-full">
                <ScrollArea className="h-[50vh] sm:h-[60vh] lg:h-[70vh] w-full rounded-md">
                  <div className="p-4 sm:p-8 max-w-none">
                    {getMockContent(document).split('\n').map((line, index) => {
                      // Helper function to parse markdown bold syntax
                      const parseMarkdown = (text: string) => {
                        return text
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/<strong>(.*?)<\/strong>/g, '<strong>$1</strong>');
                      };

                      if (line.startsWith('# ')) {
                        return (
                          <h1 key={index} className="text-3xl font-bold mb-6 text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent border-b border-border/20 pb-3">
                            <span dangerouslySetInnerHTML={{ __html: parseMarkdown(line.slice(2)) }}></span>
                          </h1>
                        );
                      } else if (line.startsWith('## ')) {
                        return (
                          <h2 key={index} className="text-2xl font-semibold mb-4 mt-8 text-foreground relative">
                            <span className="absolute -left-4 top-0 w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full"></span>
                            <span dangerouslySetInnerHTML={{ __html: parseMarkdown(line.slice(3)) }}></span>
                          </h2>
                        );
                      } else if (line.startsWith('### ')) {
                        return (
                          <h3 key={index} className="text-xl font-medium mb-3 mt-6 text-foreground/90">
                            <span dangerouslySetInnerHTML={{ __html: parseMarkdown(line.slice(4)) }}></span>
                          </h3>
                        );
                      } else if (line.startsWith('- ')) {
                        return (
                          <div key={index} className="flex items-start mb-2 ml-6">
                            <div className="w-2 h-2 bg-primary/60 rounded-full mt-2.5 mr-3 flex-shrink-0"></div>
                            <p className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(line.slice(2)) }}></p>
                          </div>
                        );
                      } else if (line.match(/^\d+\. /)) {
                        const number = line.match(/^(\d+)\. /)?.[1];
                        const text = line.replace(/^\d+\. /, '');
                        return (
                          <div key={index} className="flex items-start mb-3 ml-6">
                            <div className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-sm font-semibold rounded-full mr-3 flex-shrink-0 mt-0.5">
                              {number}
                            </div>
                            <p className="text-foreground/80 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }}></p>
                          </div>
                        );
                      } else if (line.trim() === '') {
                        return <div key={index} className="mb-5"></div>;
                      } else if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <p key={index} className="mb-4 text-foreground font-semibold leading-relaxed bg-muted/30 p-3 rounded-lg border-l-4 border-primary/40">
                            {line.slice(2, -2)}
                          </p>
                        );
                      } else {
                        return (
                           <p key={index} className="mb-4 text-foreground/70 leading-relaxed text-[15px] tracking-wide" dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }}></p>
                        );
                      }
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="flex-1 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-5 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Queries Answered</p>
                      <p className="text-xl sm:text-2xl font-bold">{document.queryCount || 0}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Last Accessed</p>
                      <p className="text-sm text-muted-foreground">{document.lastAccessed || 'Never'}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Chat References</p>
                      <p className="text-2xl font-bold">12</p>
                    </div>
                  </div>
                </Card>
              </div>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Usage Over Time</h3>
                <div className="h-32 flex items-end space-x-2">
                  {[3, 7, 2, 8, 5, 9, 4, 6, 3, 8, 5, 7].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/60 rounded-sm"
                      style={{ height: `${height * 12}px` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>12 weeks ago</span>
                  <span>This week</span>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="metadata" className="mt-6 space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Document Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">File Name</label>
                      <p className="text-sm">{document.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">File Type</label>
                      <p className="text-sm uppercase">{document.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Summary</label>
                      <p className="text-sm">{document.summary ? document.summary.split('\n')[0] : 'No summary available yet'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Upload Date</label>
                      <p className="text-sm">{document.uploadedAt}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Owner</label>
                      <p className="text-sm">{document.owner}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge className="mt-1">
                        {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Access Control</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{aclInfo.label}</span>
                      <span className="text-xs text-muted-foreground">- {aclInfo.description}</span>
                    </div>
                  </div>
                  
                  {document.preview && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Document Preview</label>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{document.preview}</p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};