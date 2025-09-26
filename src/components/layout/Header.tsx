import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-3">
          <SidebarTrigger className="mr-4" />
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
  );
};
