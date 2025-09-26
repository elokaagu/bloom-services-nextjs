import { 
  Library, 
  MessageSquare, 
  Settings, 
  BarChart3,
  Building2,
  ChevronDown,
  LogOut,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface Workspace {
  id: string;
  name: string;
  organization: string;
}

interface AppSidebarProps {
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  onWorkspaceChange: (workspace: Workspace) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const menuItems = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'admin', label: 'Members', icon: Settings },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

export function AppSidebar({ 
  currentWorkspace, 
  workspaces, 
  onWorkspaceChange, 
  onNavigate,
  currentPage 
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={`${collapsed ? "w-14" : "w-64 sm:w-64"} rounded-2xl m-3 shadow-xl border bg-card/95 backdrop-blur-sm flex flex-col h-[calc(100vh-1.5rem)]`}
      collapsible="icon"
      variant="floating"
    >
      <SidebarHeader className="p-4 border-b border-border/50">
        {!collapsed && (
          <div className="space-y-3">
            {/* Bloom Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <div className="h-5 w-5 rounded-sm bg-primary-foreground transform rotate-45"></div>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">bloom</span>
            </div>
            
            {/* Workspace Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-left h-auto py-3 border-border/50 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Building2 className="h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{currentWorkspace.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{currentWorkspace.organization}</div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((workspace) => (
                  <DropdownMenuItem 
                    key={workspace.id}
                    onClick={() => onWorkspaceChange(workspace)}
                    className="flex flex-col items-start space-y-1 p-3"
                  >
                    <div className="font-medium">{workspace.name}</div>
                    <div className="text-xs text-muted-foreground">{workspace.organization}</div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <div className="h-5 w-5 rounded-sm bg-primary-foreground transform rotate-45"></div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/80 px-2">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onNavigate(item.id)}
                    isActive={currentPage === item.id}
                    className={`w-full rounded-xl transition-all duration-200 ${
                      currentPage === item.id 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/50">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-3 h-auto rounded-xl hover:bg-accent/50 transition-colors">
                <Avatar className="h-9 w-9 mr-3 flex-shrink-0 ring-2 ring-border/20">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium truncate w-full">John Doe</p>
                  <p className="text-xs text-muted-foreground truncate w-full">john.doe@company.com</p>
                </div>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    john.doe@company.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56" side="right">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    john.doe@company.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}