import { useState } from "react";
import { Plus, Trash2, Save, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePublishers, useUpsertPublisher, useDeletePublisher } from "@/hooks/usePublishers";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

const PublishersTab = () => {
  const { data: publishers, isLoading } = usePublishers();
  const upsertPublisher = useUpsertPublisher();
  const deletePublisher = useDeletePublisher();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) {
      toast.error("No publisher data found.");
      return;
    }

    if (isBlank(editing.name)) {
      toast.error("Publisher Name is required.");
      return;
    }

    if (!isValidNumber(Number(editing.sort_order ?? 0), { min: 0 })) {
      toast.error("Sort Order must be a valid number.");
      return;
    }

    setSaving(true);
    try {
      await upsertPublisher.mutateAsync(editing);
      toast.success("Publisher saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this publisher? Books linked to it won't be affected.")) return;
    try {
      await deletePublisher.mutateAsync(id);
      toast.success("Publisher deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Publishers
        </CardTitle>
        <Button size="sm" onClick={() => setEditing({ name: "", sort_order: 0 })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Publisher
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Publisher" : "New Publisher"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Publisher Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Darussalam"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input
                  type="number"
                  value={editing.sort_order || 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {publishers?.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{p.name}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...p })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!publishers || publishers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No publishers yet. Add your first publisher above.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PublishersTab;
