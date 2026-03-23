import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, X, Loader2 } from "lucide-react";

interface AddressData {
  full_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  postcode: string;
  phone: string;
}

interface AddressFormProps {
  initial?: Partial<AddressData>;
  onSave: (data: AddressData) => Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
}

const AddressForm = ({ initial, onSave, onCancel, saveLabel = "Save Address" }: AddressFormProps) => {
  const [form, setForm] = useState<AddressData>({
    full_name: initial?.full_name || "",
    address_line1: initial?.address_line1 || "",
    address_line2: initial?.address_line2 || "",
    city: initial?.city || "",
    county: initial?.county || "",
    postcode: initial?.postcode || "",
    phone: initial?.phone || "",
  });
  const [saving, setSaving] = useState(false);

  const isValid = !!(form.full_name.trim() && form.address_line1.trim() && form.city.trim() && form.postcode.trim());

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-slate-500">Full Name *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Smith" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-slate-500">Address Line 1 *</Label>
          <Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} placeholder="123 High Street" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-slate-500">Address Line 2</Label>
          <Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} placeholder="Flat 4B" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">City *</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="London" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">County</Label>
          <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} placeholder="Greater London" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Postcode *</Label>
          <Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} placeholder="E1 6AN" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 900000" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving || !isValid} className="flex-1 gap-2 rounded-xl bg-[hsl(207,68%,28%)] hover:bg-[hsl(207,68%,24%)] h-10">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl h-10 border-slate-200">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AddressForm;
