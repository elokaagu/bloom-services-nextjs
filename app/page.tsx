"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  FileText,
  Search,
  Users,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGetStarted = () => {
    setIsLoading(true);
    // Simulate login/authentication
    setTimeout(() => {
      router.push("/app");
    }, 1500);
  };

  const features = [
    {
      icon: Search,
      title: "Intelligent Search",
      description:
        "Find information across all your documents instantly with AI-powered semantic search",
    },
    {
      icon: FileText,
      title: "Document Management",
      description:
        "Upload, organize, and manage all your organizational documents in one secure place",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Share knowledge and insights across your organization with granular access controls",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Bank-grade security with role-based access control and audit trails",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-primary/20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 shadow-sm relative overflow-hidden">
        {/* Blurred background text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-[8rem] sm:text-[12rem] lg:text-[16rem] font-black text-primary/5 select-none blur-sm">
            KNOWLEDGE
          </div>
        </div>

        {/* Header content */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Bloom</h1>
              <p className="text-xs text-muted-foreground">
                AI Knowledge Platform
              </p>
            </div>
          </div>

          <Badge
            variant="secondary"
            className="hidden sm:flex items-center space-x-1"
          >
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs">Enterprise Ready</span>
          </Badge>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* Hero Content */}
            <div className="max-w-4xl mx-auto mb-12">
              <Badge variant="outline" className="mb-6 px-4 py-2">
                <Zap className="h-4 w-4 mr-2" />
                Powered by Advanced AI
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Transform Your
                <span className="text-transparent bg-gradient-to-r from-primary via-primary-hover to-success bg-clip-text">
                  {" "}
                  Knowledge{" "}
                </span>
                Into Intelligence
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                Bloom empowers your organization with AI-driven document
                intelligence. Upload, search, and discover insights from your
                knowledge base with unprecedented speed and accuracy.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary-hover"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                     </div>

                   {/* Features List */}
                   <div className="space-y-6 mb-16">
                     {features.map((feature, index) => (
                       <Card
                         key={index}
                         className="p-6 hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm"
                       >
                         <div className="flex items-start space-x-4">
                           <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                             <feature.icon className="h-6 w-6 text-primary" />
                           </div>
                           <div className="flex-1">
                             <h3 className="text-lg font-semibold text-foreground mb-2">
                               {feature.title}
                             </h3>
                             <p className="text-sm text-muted-foreground leading-relaxed">
                               {feature.description}
                             </p>
                           </div>
                         </div>
                       </Card>
                     ))}
                   </div>
          </div>
        </div>
      </main>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-success/20 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
      </div>
    </div>
  );
}
