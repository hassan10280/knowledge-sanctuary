import { useState } from "react";
import { Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWholesaleFormFields, useUpsertFormField, useDeleteFormField } from "@/hooks/useWholesale";
import { toast } from "sonner";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Textarea" },
  { value: "dropdown", label: "Dropdown" },
];

const FormBuilderTab = () => {
  const { data: fields, isLoading } = useWholesaleFormFields();
  const upsertField = useUpsertFormField();
  const deleteField = useDeleteFormField();
  const [editingField, setEditingField] = useState<any>(null);

  const handleSave = async () => {
    if (!editingField || !editingField.label.trim()) {
      toast.error("Label is required");
      return;
    }
    try {
      await upsertField.mutateAsync(editingField);
      toast.success("Field saved!");
      setEditingField(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!fields || index <= 0) return;
    const current = fields[index];
    const prev = fields[index - 1];
    await upsertField.mutateAsync({ ...current, sort_order: prev.sort_order });
    await upsertField.mutateAsync({ ...prev, sort_order: current.sort_order });
  };

  const handleMoveDown = async (index: number) => {
    if (!fields || index >= fields.length - 1) return;
    const current = fields[index];
    const next = fields[index + 1];
    await upsertField.mutateAsync({ ...current, sort_order: next.sort_order });
    await upsertField.mutateAsync({ ...next, sort_order: current.sort_order });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this field?")) return;
    try {
      await deleteField.mutateAsync(id);
      toast.success("Field deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">Wholesale Form Builder</CardTitle>
        <Button
          size="sm"
          onClick={() => setEditingField({
            field_type: "text",
            label: "",
            placeholder: "",
            required: false,
            options: [],
            sort_order: (fields?.length || 0) + 1,
          })}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Editor */}
        {editingField && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editingField.id ? "Edit Field" : "New Field"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Field Type</Label>
                <Select value={editingField.field_type} onValueChange={v => setEditingField({ ...editingField, field_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Label</Label>
                <Input value={editingField.label} onChange={e => setEditingField({ ...editingField, label: e.target.value })} className="h-9 text-xs" placeholder="Field label" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Placeholder</Label>
                <Input value={editingField.placeholder || ""} onChange={e => setEditingField({ ...editingField, placeholder: e.target.value })} className="h-9 text-xs" placeholder="Placeholder text" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={editingField.sort_order || 0} onChange={e => setEditingField({ ...editingField, sort_order: parseInt(e.target.value) || 0 })} className="h-9 text-xs" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={editingField.required} onCheckedChange={v => setEditingField({ ...editingField, required: v })} />
              <Label className="text-xs font-medium">Required Field</Label>
            </div>

            {editingField.field_type === "dropdown" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Dropdown Options</Label>
                {((editingField.options as string[]) || []).map((opt: string, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={opt}
                      onChange={e => {
                        const updated = [...(editingField.options as string[])];
                        updated[i] = e.target.value;
                        setEditingField({ ...editingField, options: updated });
                      }}
                      className="h-8 text-xs flex-1"
                      placeholder={`Option ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => {
                        const updated = (editingField.options as string[]).filter((_: any, idx: number) => idx !== i);
                        setEditingField({ ...editingField, options: updated });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => setEditingField({ ...editingField, options: [...(editingField.options || []), ""] })}
                >
                  <Plus className="h-3 w-3" /> Add Option
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={upsertField.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save Field
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Fields list */}
        <div className="space-y-2">
          {fields?.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleMoveDown(index)} disabled={index === (fields?.length || 0) - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{field.label}</p>
                <p className="text-xs text-muted-foreground">
                  {field.field_type} {field.required ? "• required" : "• optional"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setEditingField({ ...field })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(field.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!fields || fields.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No fields yet. Click "Add Field" to get started.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormBuilderTab;
