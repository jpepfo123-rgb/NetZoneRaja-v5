import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetCustomer, 
  useListCalls, 
  useListRemarks, 
  useListReminders,
  useCreateRemark,
  useCreateReminder,
  useUpdateReminder
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Building, MapPin, Calendar, Clock, MessageSquare, Bell, PhoneIncoming, PhoneOutgoing, PhoneMissed, Plus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: customer, isLoading: loadingCustomer } = useGetCustomer(id);
  const { data: calls, isLoading: loadingCalls } = useListCalls({ customerId: id, limit: 100 });
  const { data: remarks, isLoading: loadingRemarks } = useListRemarks({ customerId: id });
  const { data: reminders, isLoading: loadingReminders } = useListReminders({ customerId: id });

  const [remarkText, setRemarkText] = useState("");
  const [remarkOpen, setRemarkOpen] = useState(false);
  
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderPriority, setReminderPriority] = useState<"low" | "medium" | "high">("medium");
  const [reminderOpen, setReminderOpen] = useState(false);

  const createRemark = useCreateRemark({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/remarks"] });
        setRemarkText("");
        setRemarkOpen(false);
      }
    }
  });

  const createReminder = useCreateReminder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
        setReminderTitle("");
        setReminderDate("");
        setReminderPriority("medium");
        setReminderOpen(false);
      }
    }
  });

  const updateReminder = useUpdateReminder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      }
    }
  });

  const handleAddRemark = () => {
    if (!remarkText.trim()) return;
    createRemark.mutate({ data: { customerId: id, text: remarkText } });
  };

  const handleAddReminder = () => {
    if (!reminderTitle.trim() || !reminderDate) return;
    createReminder.mutate({ 
      data: { 
        customerId: id, 
        title: reminderTitle, 
        dateTime: new Date(reminderDate).toISOString(),
        priority: reminderPriority
      } 
    });
  };

  const handleCompleteReminder = (reminderId: string) => {
    updateReminder.mutate({ id: reminderId, data: { status: "completed" as any } });
  };

  if (loadingCustomer) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading customer details...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-destructive">Customer not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary uppercase">
              {customer.category}
            </span>
            <span>Customer ID: {customer.id.split('-')[0]}</span>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">{customer.mobile}</p>
                {customer.alternateNumber && <p className="text-muted-foreground">{customer.alternateNumber} (Alt)</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>{customer.email || "No email provided"}</p>
            </div>
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>{customer.company || "No company provided"}</p>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>
                {customer.address || "No address provided"}
                {customer.city && <><br />{customer.city}</>}
              </p>
            </div>
            
            <div className="pt-4 mt-4 border-t space-y-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Added</span>
                <span>{format(new Date(customer.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Last Call</span>
                <span>{customer.lastCallAt ? format(new Date(customer.lastCallAt), "MMM d, yyyy") : "Never"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Total Calls</span>
                <span className="font-medium text-foreground">{customer.totalCalls || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col min-h-[500px]">
          <Tabs defaultValue="calls" className="w-full flex-1 flex flex-col">
            <CardHeader className="py-3 border-b border-border/50">
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger value="calls" className="data-[state=active]:bg-background">Call History</TabsTrigger>
                <TabsTrigger value="remarks" className="data-[state=active]:bg-background">Remarks</TabsTrigger>
                <TabsTrigger value="reminders" className="data-[state=active]:bg-background">Reminders</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              
              <TabsContent value="calls" className="h-full m-0 overflow-auto p-4 space-y-4">
                {loadingCalls ? (
                  <div className="text-center py-8 text-muted-foreground">Loading calls...</div>
                ) : !calls?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No call history.</div>
                ) : (
                  <div className="relative border-l ml-4 space-y-6 pb-4">
                    {calls.map(call => (
                      <div key={call.id} className="relative pl-6">
                        <div className={`absolute -left-[13px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${
                          call.type === 'incoming' ? 'bg-blue-100 text-blue-600' : 
                          call.type === 'outgoing' ? 'bg-green-100 text-green-600' : 
                          'bg-red-100 text-red-600'
                        }`}>
                          {call.type === 'incoming' ? <PhoneIncoming className="w-3 h-3" /> : 
                           call.type === 'outgoing' ? <PhoneOutgoing className="w-3 h-3" /> : 
                           <PhoneMissed className="w-3 h-3" />}
                        </div>
                        <div className="bg-muted/30 border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium capitalize text-sm">{call.type} Call</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(call.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                            </div>
                            <span className="text-xs font-mono bg-background px-2 py-1 rounded border">
                              {Math.floor(call.duration / 60)}m {call.duration % 60}s
                            </span>
                          </div>
                          {call.remark && (
                            <p className="text-sm mt-2 text-foreground/80 bg-background/50 p-2 rounded">{call.remark}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 text-right">Agent: {call.agentName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="remarks" className="h-full m-0 flex flex-col">
                <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
                  <span className="text-sm font-medium">Customer Notes & Remarks</span>
                  <Dialog open={remarkOpen} onOpenChange={setRemarkOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Remark</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add a Remark</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Textarea 
                          placeholder="Type your notes here..." 
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <Button onClick={handleAddRemark} disabled={!remarkText.trim() || createRemark.isPending} className="w-full">
                          {createRemark.isPending ? "Saving..." : "Save Remark"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {loadingRemarks ? (
                    <div className="text-center py-8 text-muted-foreground">Loading remarks...</div>
                  ) : !remarks?.length ? (
                    <div className="text-center py-12 flex flex-col items-center text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
                      <p>No remarks added yet.</p>
                    </div>
                  ) : (
                    remarks.map(remark => (
                      <div key={remark.id} className="bg-card border rounded-lg p-4 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{remark.text}</p>
                        <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground pt-3 border-t">
                          <span>Agent ID: {remark.agentId.split('-')[0]}</span>
                          <span>{format(new Date(remark.createdAt), "MMM d, yyyy h:mm a")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reminders" className="h-full m-0 flex flex-col">
                <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
                  <span className="text-sm font-medium">Follow-ups & Reminders</span>
                  <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Reminder</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule a Reminder</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Title / Objective</label>
                          <Input 
                            placeholder="Call back regarding..." 
                            value={reminderTitle}
                            onChange={(e) => setReminderTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date & Time</label>
                          <Input 
                            type="datetime-local" 
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Priority</label>
                          <Select value={reminderPriority} onValueChange={(v: any) => setReminderPriority(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAddReminder} disabled={!reminderTitle || !reminderDate || createReminder.isPending} className="w-full">
                          {createReminder.isPending ? "Scheduling..." : "Schedule Reminder"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {loadingReminders ? (
                    <div className="text-center py-8 text-muted-foreground">Loading reminders...</div>
                  ) : !reminders?.length ? (
                    <div className="text-center py-12 flex flex-col items-center text-muted-foreground">
                      <Bell className="w-10 h-10 mb-3 opacity-20" />
                      <p>No reminders scheduled.</p>
                    </div>
                  ) : (
                    reminders.map(reminder => (
                      <div key={reminder.id} className={`bg-card border rounded-lg p-4 shadow-sm flex items-start gap-4 ${reminder.status === 'completed' ? 'opacity-60' : ''}`}>
                        <div className={`p-2 rounded-full mt-1 shrink-0 ${
                          reminder.status === 'completed' ? 'bg-green-100 text-green-600' :
                          reminder.priority === 'high' ? 'bg-red-100 text-red-600' :
                          reminder.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {reminder.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-medium ${reminder.status === 'completed' ? 'line-through' : ''}`}>{reminder.title}</h4>
                            <span className="text-xs shrink-0 whitespace-nowrap text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">
                              {format(new Date(reminder.dateTime), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {reminder.notes && <p className="text-sm mt-1 text-muted-foreground">{reminder.notes}</p>}
                          
                          {reminder.status !== 'completed' && (
                            <div className="mt-3 flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs gap-1"
                                onClick={() => handleCompleteReminder(reminder.id)}
                                disabled={updateReminder.isPending}
                              >
                                <CheckCircle2 className="w-3 h-3" /> Mark Done
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
