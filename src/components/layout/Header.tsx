import { SidebarTrigger } from "@/components/ui/sidebar";

export const Header = () => {
  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center px-4 py-4">
      <SidebarTrigger className="mr-4" />
    </header>
  );
};