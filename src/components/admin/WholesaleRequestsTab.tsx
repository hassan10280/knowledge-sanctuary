import { useState } from "react";
import { CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWholesaleApplications, useUpdateApplication, useWholesaleFormFields } from "@/hooks/useWholesale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const WholesaleRequestsTab = () => {
  const { user } = useAuth();
  const { data: applications, isLoading } = useWholesaleApplications();
  const { data: formFields } = useWholesaleFormFields();
  const updateApp = useUpdateApplication();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const getFieldLabel = (fieldId: string) => {
    return formFields?.find(f => f.id === fieldId)?.label || fieldId;
  };

  const handleApprove = async (appId: string, userId: string) => {
    try {
      // Update application status
      await updateApp.mutateAsync({ id: appId, status: "approved", reviewed_by: user?.id });
      // Add wholesale role to user
      await supabase.from("user_roles").upsert({ user_id: userId, role: "wholesale" as any });
      toast.success("Application approved! User now has wholesale access.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (appId: string) => {
    const notes = rejectNotes[appId] || "";
    try {
      await updateApp.mutateAsync({ id: appId, status: "rejected", admin_notes: notes, reviewed_by: user?.id });
      toast.success("Application rejected.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  const pending = applications?.filter(a => a.status === "pending") || [];
  const reviewed = applications?.filter(a => a.status !== "pending") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">
          Wholesale Requests
          {pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pending.length} pending
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!applications || applications.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-8">No wholesale applications yet.</p>
        )}

        {/* Pending Applications */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Pending Applications</h3>
            {pending.map(app => {
              const isExpanded = expandedId === app.id;
              const Icon = statusIcons[app.status] || Clock;
              return (
                <div key={app.id} className="border border-border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[app.status]}`}>
                        <Icon className="h-3 w-3 inline mr-1" />
                        {app.status}
                      </div>
                      <span className="text-sm font-medium">{(app.form_data as any)?.[(formFields?.[0]?.id || '')] || 'Application'}</span>
                      <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                      {/* Form Data */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(app.form_data as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{getFieldLabel(key)}</p>
                            <p className="text-sm text-foreground">{val || "—"}</p>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3 pt-2 border-t border-border">
                        <Textarea
                          placeholder="Notes (optional, shown on rejection)..."
                          value={rejectNotes[app.id] || ""}
                          onChange={e => setRejectNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(app.id, app.user_id)}
                            disabled={updateApp.isPending}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(app.id)}
                            disabled={updateApp.isPending}
                            className="gap-1.5"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reviewed Applications */}
        {reviewed.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-foreground">Reviewed Applications</h3>
            {reviewed.map(app => {
              const isExpanded = expandedId === app.id;
              const Icon = statusIcons[app.status] || Clock;
              return (
                <div key={app.id} className="border border-border rounded-xl overflow-hidden opacity-80">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[app.status]}`}>
                        <Icon className="h-3 w-3 inline mr-1" />
                        {app.status}
                      </div>
                      <span className="text-sm">{(app.form_data as any)?.[(formFields?.[0]?.id || '')] || 'Application'}</span>
                      <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(app.form_data as Record<string, string>).map(([key, val]) => (
                          <div key={key} className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{getFieldLabel(key)}</p>
                            <p className="text-sm text-foreground">{val || "—"}</p>
                          </div>
                        ))}
                      </div>
                      {app.admin_notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Notes</p>
                          <p className="text-sm">{app.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WholesaleRequestsTab;
