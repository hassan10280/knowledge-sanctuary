import { useState, useMemo } from "react";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWholesaleApplications, useWholesaleFormFields } from "@/hooks/useWholesale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Clock, label: "Pending" },
  approved: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle, label: "Approved" },
  rejected: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: XCircle, label: "Rejected" },
};

const WholesaleRequestsTab = () => {
  const { user } = useAuth();
  const { data: applications, isLoading } = useWholesaleApplications();
  const { data: formFields } = useWholesaleFormFields();
  const updateApp = useUpdateApplication();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getFieldLabel = (fieldId: string) => formFields?.find(f => f.id === fieldId)?.label || fieldId;
  const getFirstFieldValue = (app: any) => (app.form_data as any)?.[(formFields?.[0]?.id || '')] || 'Unknown';

  const isNew = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  const filtered = useMemo(() => {
    if (!applications) return [];
    return applications.filter(app => {
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const name = getFirstFieldValue(app).toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, search, formFields]);

  const handleApprove = async (appId: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "approve_wholesale", application_id: appId, target_user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["wholesale-applications"] });
      toast.success("Application approved!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (appId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "reject_wholesale", application_id: appId, admin_notes: rejectNotes[appId] || "" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["wholesale-applications"] });
      toast.success("Application rejected.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const pendingCount = applications?.filter(a => a.status === "pending").length || 0;

  if (isLoading) return <div className="text-sm text-muted-foreground p-8 text-center">Loading applications...</div>;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-serif text-xl flex items-center gap-2.5">
            Wholesale Applications
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs font-semibold">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted/30 border-border/50 focus:bg-background"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 bg-muted/30 border-border/50">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No applications found.</p>
          </div>
        )}

        {/* Application List */}
        <div className="space-y-3">
          {filtered.map(app => {
            const isExpanded = expandedId === app.id;
            const config = statusConfig[app.status] || statusConfig.pending;
            const Icon = config.icon;
            const isNewApp = isNew(app.created_at);

            return (
              <div
                key={app.id}
                className={`rounded-xl border transition-all duration-200 ${
                  isNewApp && app.status === "pending"
                    ? "bg-amber-50/30 border-amber-200/60"
                    : "bg-card border-border/40 hover:border-border"
                } ${isExpanded ? "shadow-sm" : ""}`}
              >
                {/* Row Header */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors rounded-xl hover:bg-muted/30"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {getFirstFieldValue(app)}
                        </span>
                        {isNewApp && app.status === "pending" && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                            <Sparkles className="h-2.5 w-2.5" />
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-muted-foreground ml-2">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-border/30 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(app.form_data as Record<string, string>).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {getFieldLabel(key)}
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">{val || "—"}</p>
                        </div>
                      ))}
                    </div>

                    {app.admin_notes && (
                      <div className="p-3.5 bg-muted/50 rounded-lg border border-border/30">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Admin Notes</p>
                        <p className="text-sm text-foreground">{app.admin_notes}</p>
                      </div>
                    )}

                    {app.status === "pending" && (
                      <div className="space-y-3 pt-2 border-t border-border/30">
                        <Textarea
                          placeholder="Add notes (visible on rejection)..."
                          value={rejectNotes[app.id] || ""}
                          onChange={e => setRejectNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                          rows={2}
                          className="text-sm bg-muted/20 border-border/40 resize-none"
                        />
                        <div className="flex gap-2.5">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(app.id, app.user_id)}
                            disabled={updateApp.isPending}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 h-9 text-xs font-semibold transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(app.id)}
                            disabled={updateApp.isPending}
                            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-4 h-9 text-xs font-semibold transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WholesaleRequestsTab;
