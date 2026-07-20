import { useState } from "react";
import { useListAgents, useCreateAgent, useUpdateAgent } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, UserPlus, UserCircle, Phone, Lock, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const { data: agents, isLoading } = useListAgents();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    role: "agent" as "admin" | "agent",
    isActive: true
  });

  const createAgent = useCreateAgent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
        setOpen(false);
        resetForm();
      }
    }
  });

  const updateAgent = useUpdateAgent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
        setOpen(false);
        resetForm();
      }
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      username: "",
      name: "",
      password: "",
      role: "agent",
      isActive: true
    });
  };

  const handleEdit = (agent: any) => {
    setEditingId(agent.id);
    setFormData({
      username: agent.username,
      name: agent.name,
      password: "", // intentionally blank
      role: agent.role,
      isActive: agent.isActive
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      const updateData: any = {
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateAgent.mutate({ id: editingId, data: updateData });
    } else {
      createAgent.mutate({ 
        data: {
          username: formData.username,
          name: formData.name,
          password: formData.password,
          role: formData.role
        } 
      });
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col max-w-5xl mx-auto">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
          <p className="text-muted-foreground mt-1">Manage system access and roles.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => {
          if (!val) resetForm();
          setOpen(val);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Agent" : "Create New Agent"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {!editingId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username (Login ID)</label>
                  <Input 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{editingId ? "New Password (leave blank to keep current)" : "Password"}</label>
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent (App Access)</SelectItem>
                    <SelectItem value="admin">Admin (Dashboard Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingId && (
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Active Status</label>
                    <p className="text-xs text-muted-foreground">Allow user to login</p>
                  </div>
                  <Switch 
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                  />
                </div>
              )}
              <Button 
                className="w-full mt-4" 
                onClick={handleSubmit}
                disabled={(!editingId && !formData.password) || !formData.name || createAgent.isPending || updateAgent.isPending}
              >
                {editingId ? "Save Changes" : "Create Agent"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Agent Details</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading agents...</td>
                </tr>
              ) : !agents || agents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No agents found.</td>
                </tr>
              ) : (
                agents.map(agent => (
                  <tr key={agent.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{agent.name}</div>
                          <div className="text-xs text-muted-foreground">@{agent.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {agent.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <ShieldAlert className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <Phone className="w-3 h-3" /> Agent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {agent.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(agent.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(agent)} className="h-8 gap-1">
                        <Edit className="w-3 h-3" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
