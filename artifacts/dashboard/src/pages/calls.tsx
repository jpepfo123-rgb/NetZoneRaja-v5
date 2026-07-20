import { useState } from "react";
import { useListCalls, useListAgents } from "@workspace/api-client-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Download, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CallsPage() {
  const [period, setPeriod] = useState<string>("today");
  const [type, setType] = useState<string>("all");
  const [agentId, setAgentId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: agents } = useListAgents();
  const { data: calls, isLoading } = useListCalls({
    period: period as any,
    type: type !== "all" ? type : undefined,
    agentId: agentId !== "all" ? agentId : undefined,
    limit: 1000 // In a real app we'd paginate, but for exporting it helps to have all
  });

  const filteredCalls = calls?.filter(c => 
    !search || 
    c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneNumber?.includes(search) ||
    c.agentName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const exportExcel = () => {
    if (!filteredCalls.length) return;
    const worksheet = XLSX.utils.json_to_sheet(filteredCalls.map(c => ({
      Date: format(new Date(c.createdAt), "yyyy-MM-dd HH:mm:ss"),
      Type: c.type,
      "Customer Name": c.customerName || "-",
      "Phone": c.phoneNumber || "-",
      Agent: c.agentName || "-",
      Duration: `${c.duration}s`,
      Remark: c.remark || "-"
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calls");
    XLSX.writeFile(workbook, `calls_export_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const exportPDF = () => {
    if (!filteredCalls.length) return;
    const doc = new jsPDF();
    doc.text("Calls Report", 14, 15);
    
    const tableData = filteredCalls.map(c => [
      format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
      c.type,
      c.customerName || c.phoneNumber || "-",
      c.agentName || "-",
      `${c.duration}s`
    ]);

    (doc as any).autoTable({
      head: [["Date", "Type", "Customer", "Agent", "Duration"]],
      body: tableData,
      startY: 20,
    });
    
    doc.save(`calls_export_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
          <p className="text-muted-foreground mt-1">Review and export all call records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <FileText className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or number..." 
                className="pl-9 w-full max-w-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Call Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Agent</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading calls...</td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No calls found for these filters.</td>
                </tr>
              ) : (
                filteredCalls.map(call => (
                  <tr key={call.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(call.createdAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {call.type === 'incoming' && <PhoneIncoming className="w-4 h-4 text-blue-500" />}
                        {call.type === 'outgoing' && <PhoneOutgoing className="w-4 h-4 text-green-500" />}
                        {call.type === 'missed' && <PhoneMissed className="w-4 h-4 text-red-500" />}
                        <span className="capitalize">{call.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-foreground">{call.customerName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{call.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">{call.agentName}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </td>
                    <td className="px-6 py-3 truncate max-w-[200px]" title={call.remark || ""}>
                      {call.remark || "-"}
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
