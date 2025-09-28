import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  MoreHorizontal,
  Shield,
  Edit,
  Trash2,
  Crown,
  FileText,
  Eye,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "contributor" | "reader";
  joinedAt: string;
  lastActive: string;
  documentsUploaded: number;
  queriesThisMonth: number;
}

const mockMembers: Member[] = [
  {
    id: "1",
    name: "Eloka Agu",
    email: "eloka@bloom.com",
    role: "admin",
    joinedAt: "2024-01-15",
    lastActive: "2 hours ago",
    documentsUploaded: 23,
    queriesThisMonth: 156,
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah.chen@bloom.com",
    role: "contributor",
    joinedAt: "2024-02-03",
    lastActive: "1 day ago",
    documentsUploaded: 45,
    queriesThisMonth: 89,
  },
  {
    id: "3",
    name: "Michael Rodriguez",
    email: "michael.rodriguez@bloom.com",
    role: "reader",
    joinedAt: "2024-03-10",
    lastActive: "3 days ago",
    documentsUploaded: 0,
    queriesThisMonth: 34,
  },
  {
    id: "4",
    name: "Emily Watson",
    email: "emily.watson@bloom.com",
    role: "contributor",
    joinedAt: "2024-02-28",
    lastActive: "5 hours ago",
    documentsUploaded: 12,
    queriesThisMonth: 67,
  },
];

export const MemberManagement = () => {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "reader" });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "contributor":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "reader":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: "bg-yellow-100 text-yellow-800",
      contributor: "bg-blue-100 text-blue-800",
      reader: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge
        variant="secondary"
        className={variants[role as keyof typeof variants]}
      >
        <div className="flex items-center space-x-1">
          {getRoleIcon(role)}
          <span className="capitalize">{role}</span>
        </div>
      </Badge>
    );
  };

  const handleInviteMember = () => {
    // Mock invite logic
    console.log("Inviting:", inviteForm);
    setIsInviteOpen(false);
    setInviteForm({ email: "", role: "reader" });
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    setMembers(
      members.map((member) =>
        member.id === memberId
          ? { ...member, role: newRole as Member["role"] }
          : member
      )
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter((member) => member.id !== memberId));
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-[var(--header-offset)]">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage workspace members and their permissions
          </p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Invite Member</span>
              <span className="sm:hidden">Invite</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join this workspace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@bloom.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) =>
                    setInviteForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reader">
                      Reader - Can view and query documents
                    </SelectItem>
                    <SelectItem value="contributor">
                      Contributor - Can upload and manage documents
                    </SelectItem>
                    <SelectItem value="admin">
                      Admin - Full workspace permissions
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteMember}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Member</TableHead>
                <TableHead className="min-w-[120px]">Role</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[100px]">
                  Joined
                </TableHead>
                <TableHead className="hidden md:table-cell min-w-[120px]">
                  Last Active
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center min-w-[100px]">
                  Documents
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center min-w-[80px]">
                  Queries
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage
                          src={`/placeholder-avatar-${member.id}.jpg`}
                        />
                        <AvatarFallback className="text-xs">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                        {/* Mobile-only additional info */}
                        <div className="flex flex-wrap gap-2 mt-2 sm:hidden">
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-1"
                          >
                            Joined{" "}
                            {new Date(member.joinedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", year: "numeric" }
                            )}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-1"
                          >
                            {member.documentsUploaded} docs
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    {getRoleBadge(member.role)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-4 text-sm text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-4 text-sm text-muted-foreground">
                    {member.lastActive}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {member.documentsUploaded}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-4 text-center">
                    <span className="text-sm">{member.queriesThisMonth}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "admin")}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(member.id, "contributor")
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Make Contributor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "reader")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Make Reader
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
