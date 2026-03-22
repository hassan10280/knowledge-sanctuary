import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, MapPin, Truck, DollarSign, Gift, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useShippingZones, useUpsertShippingZone, useDeleteShippingZone,
  useShippingMethods, useUpsertShippingMethod, useDeleteShippingMethod,
  useShippingRates, useUpsertShippingRate, useDeleteShippingRate,
  useFreeShippingRules, useUpsertFreeShippingRule, useDeleteFreeShippingRule,
} from "@/hooks/useShipping";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

/* ─── Zones Sub-Tab ─── */
const ZonesPanel = () => {
  const { data: zones, isLoading } = useShippingZones();
  const upsert = useUpsertShippingZone();
  const del = useDeleteShippingZone();
  const [editing, setEditing] = useState<any>(null);
  const [locInput, setLocInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) { toast.error("No zone data found."); return; }
    if (isBlank(editing.name)) { toast.error("Zone Name is required."); return; }
    if (!isValidNumber(Number(editing.sort_order ?? 0), { min: 0 })) { toast.error("Sort Order must be a valid number."); return; }
    if (!Array.isArray(editing.locations)) { toast.error("Locations must be a valid list."); return; }

    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast.success("Zone saved!");
      setEditing(null);
      setLocInput("");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const addLocation = () => {
    if (!locInput.trim()) return;
    setEditing({ ...editing, locations: [...(editing.locations || []), locInput.trim()] });
    setLocInput("");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define delivery zones (e.g. Dhaka, Outside Dhaka, International)</p>
        <Button size="sm" onClick={() => setEditing({ name: "", locations: [], is_active: true, sort_order: 0 })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Zone
        </Button>
      </div>

      {editing && (
        <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
          <h3 className="text-sm font-semibold">{editing.id ? "Edit Zone" : "New Zone"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Zone Name</Label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Dhaka" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="h-9 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Locations (cities/areas in this zone)</Label>
            <div className="flex gap-2">
              <Input value={locInput} onChange={e => setLocInput(e.target.value)} placeholder="Add city/area..." className="h-9 text-xs" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLocation())} />
              <Button size="sm" variant="outline" onClick={addLocation}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(editing.locations || []).map((loc: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                  {loc}
                  <button onClick={() => setEditing({ ...editing, locations: editing.locations.filter((_: string, idx: number) => idx !== i) })} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
            <Label className="text-xs">Active</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {zones?.map(z => (
          <div key={z.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {z.name}</p>
              <p className="text-xs text-muted-foreground">{(z.locations as string[]).join(", ") || "No locations set"} {!z.is_active && " • Inactive"}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing({ ...z })}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutateAsync(z.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {(!zones || zones.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">No zones yet. Add your first shipping zone.</p>}
      </div>
    </div>
  );
};

/* ─── Methods Sub-Tab (with estimated delivery days) ─── */
const MethodsPanel = () => {
  const { data: methods, isLoading } = useShippingMethods();
  const upsert = useUpsertShippingMethod();
  const del = useDeleteShippingMethod();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) { toast.error("No method data found."); return; }
    if (isBlank(editing.name)) { toast.error("Method Name is required."); return; }
    if (!isValidNumber(Number(editing.sort_order ?? 0), { min: 0 })) { toast.error("Sort Order must be a valid number."); return; }

    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast.success("Method saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define delivery methods (e.g. Home Delivery, Courier, Pickup)</p>
        <Button size="sm" onClick={() => setEditing({ name: "", description: "", estimated_delivery_days: "", is_active: true, sort_order: 0 })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Method
        </Button>
      </div>

      {editing && (
        <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
          <h3 className="text-sm font-semibold">{editing.id ? "Edit Method" : "New Method"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Method Name</Label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Home Delivery" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Delivered to your door" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estimated Delivery Time</Label>
              <Input value={editing.estimated_delivery_days || ""} onChange={e => setEditing({ ...editing, estimated_delivery_days: e.target.value })} placeholder="e.g. 2-3 days, 1 week" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="h-9 text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
            <Label className="text-xs">Active</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {methods?.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-primary" /> {m.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.description || "No description"}
                {(m as any).estimated_delivery_days ? ` • Est: ${(m as any).estimated_delivery_days}` : ""}
                {!m.is_active && " • Inactive"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing({ ...m })}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutateAsync(m.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {(!methods || methods.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">No methods yet. Add your first shipping method.</p>}
      </div>
    </div>
  );
};

/* ─── Rates Sub-Tab ─── */
const RatesPanel = ({ wholesaleOnly }: { wholesaleOnly?: boolean }) => {
  const { data: zones } = useShippingZones();
  const { data: methods } = useShippingMethods();
  const { data: allRates, isLoading } = useShippingRates();
  const rates = allRates?.filter(r => wholesaleOnly !== undefined ? r.is_wholesale === wholesaleOnly : true);
  const upsert = useUpsertShippingRate();
  const del = useDeleteShippingRate();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) { toast.error("No shipping rate data found."); return; }
    if (isBlank(editing.zone_id)) { toast.error("Zone is required."); return; }
    if (isBlank(editing.method_id)) { toast.error("Method is required."); return; }
    if (editing.rate_type === "flat") {
      if (!isValidNumber(Number(editing.flat_rate), { min: 0 })) {
        toast.error("Flat Rate must be 0 or greater.");
        return;
      }
    }
    if (editing.rate_type === "price_based") {
      const ranges = Array.isArray(editing.price_ranges) ? editing.price_ranges : [];
      if (!ranges.length) {
        toast.error("Price Ranges must contain at least one range.");
        return;
      }
      for (let i = 0; i < ranges.length; i += 1) {
        const range = ranges[i];
        if (!isValidNumber(Number(range.min), { min: 0 })) {
          toast.error(`Price Range ${i + 1}: Min must be 0 or greater.`);
          return;
        }
        if (!isValidNumber(Number(range.cost), { min: 0 })) {
          toast.error(`Price Range ${i + 1}: Cost must be 0 or greater.`);
          return;
        }
        if (Number(range.max) !== 0 && !isValidNumber(Number(range.max), { min: Number(range.min) })) {
          toast.error(`Price Range ${i + 1}: Max must be 0 or at least the Min value.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast.success("Rate saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const addPriceRange = () => {
    const ranges = editing.price_ranges || [];
    setEditing({ ...editing, price_ranges: [...ranges, { min: 0, max: 0, cost: 0 }] });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Set rates per zone + method combination</p>
        <Button size="sm" onClick={() => setEditing({
          zone_id: zones?.[0]?.id || "", method_id: methods?.[0]?.id || "",
          rate_type: "flat", flat_rate: 0, price_ranges: [], is_wholesale: !!wholesaleOnly, is_active: true,
        })} className="gap-1.5" disabled={!zones?.length || !methods?.length}>
          <Plus className="h-4 w-4" /> Add Rate
        </Button>
      </div>

      {(!zones?.length || !methods?.length) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Please create at least one Zone and one Method before adding rates.
        </div>
      )}

      {editing && (
        <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
          <h3 className="text-sm font-semibold">{editing.id ? "Edit Rate" : "New Rate"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Zone</Label>
              <Select value={editing.zone_id} onValueChange={v => setEditing({ ...editing, zone_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select zone..." /></SelectTrigger>
                <SelectContent>
                  {zones?.filter(z => z.is_active).map(z => <SelectItem key={z.id} value={z.id} className="text-xs">{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={editing.method_id} onValueChange={v => setEditing({ ...editing, method_id: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>
                  {methods?.filter(m => m.is_active).map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rate Type</Label>
              <Select value={editing.rate_type} onValueChange={v => setEditing({ ...editing, rate_type: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat" className="text-xs">Flat Rate</SelectItem>
                  <SelectItem value="price_based" className="text-xs">Price-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {editing.rate_type === "flat" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Flat Rate (£)</Label>
              <Input type="number" min={0} step="0.01" value={editing.flat_rate} onChange={e => setEditing({ ...editing, flat_rate: parseFloat(e.target.value) || 0 })} className="h-9 text-xs w-40" />
            </div>
          )}

          {editing.rate_type === "price_based" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Price Ranges</Label>
                <Button size="sm" variant="outline" onClick={addPriceRange} className="gap-1 text-xs h-7"><Plus className="h-3 w-3" /> Add Range</Button>
              </div>
              {(editing.price_ranges || []).map((range: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span>£</span>
                    <Input type="number" min={0} step="0.01" value={range.min} onChange={e => {
                      const updated = [...editing.price_ranges];
                      updated[i] = { ...updated[i], min: parseFloat(e.target.value) || 0 };
                      setEditing({ ...editing, price_ranges: updated });
                    }} className="h-8 text-xs w-20" />
                    <span>–</span>
                    <span>£</span>
                    <Input type="number" min={0} step="0.01" value={range.max} onChange={e => {
                      const updated = [...editing.price_ranges];
                      updated[i] = { ...updated[i], max: parseFloat(e.target.value) || 0 };
                      setEditing({ ...editing, price_ranges: updated });
                    }} className="h-8 text-xs w-20" placeholder="0=∞" />
                    <span>→ £</span>
                    <Input type="number" min={0} step="0.01" value={range.cost} onChange={e => {
                      const updated = [...editing.price_ranges];
                      updated[i] = { ...updated[i], cost: parseFloat(e.target.value) || 0 };
                      setEditing({ ...editing, price_ranges: updated });
                    }} className="h-8 text-xs w-20" />
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => {
                    const updated = editing.price_ranges.filter((_: any, idx: number) => idx !== i);
                    setEditing({ ...editing, price_ranges: updated });
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Set max to 0 for unlimited. Example: £0–£999 → £100, £1000–0 → £50</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
            <Label className="text-xs">Active</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rates?.map(r => {
          const zone = zones?.find(z => z.id === r.zone_id);
          const method = methods?.find(m => m.id === r.method_id);
          return (
            <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">{zone?.name || "?"} → {method?.name || "?"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.rate_type === "flat" ? `Flat: £${Number(r.flat_rate).toFixed(2)}` : `Price-based (${((r.price_ranges as any[]) || []).length} ranges)`}
                  {r.is_wholesale ? " • Wholesale" : " • Retail"}
                  {!r.is_active ? " • Inactive" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...r })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutateAsync(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {(!rates || rates.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">No rates configured.</p>}
      </div>
    </div>
  );
};

/* ─── Free Shipping Rules Sub-Tab ─── */
const FreeShippingPanel = ({ wholesaleOnly }: { wholesaleOnly?: boolean }) => {
  const { data: zones } = useShippingZones();
  const { data: allRules, isLoading } = useFreeShippingRules();
  const rules = allRules?.filter(r => wholesaleOnly !== undefined ? r.is_wholesale === wholesaleOnly : true);
  const upsert = useUpsertFreeShippingRule();
  const del = useDeleteFreeShippingRule();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) { toast.error("No free shipping rule data found."); return; }
    if (isBlank(editing.name)) { toast.error("Rule Name is required."); return; }
    if (!editing.always_free && !isValidNumber(Number(editing.min_order_amount), { min: 0 })) {
      toast.error("Minimum Order Amount must be 0 or greater.");
      return;
    }

    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast.success("Free shipping rule saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Set conditions for free shipping</p>
        <Button size="sm" onClick={() => setEditing({ name: "", min_order_amount: 0, is_wholesale: !!wholesaleOnly, is_active: true, always_free: false, zone_id: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Rule
        </Button>
      </div>

      {editing && (
        <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
          <h3 className="text-sm font-semibold">{editing.id ? "Edit Rule" : "New Rule"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Rule Name</Label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Free shipping over £50" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zone (optional)</Label>
              <Select value={editing.zone_id || "__all__"} onValueChange={v => setEditing({ ...editing, zone_id: v === "__all__" ? null : v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">All Zones</SelectItem>
                  {zones?.filter(z => z.is_active).map(z => <SelectItem key={z.id} value={z.id} className="text-xs">{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={editing.always_free} onCheckedChange={v => setEditing({ ...editing, always_free: v })} />
              <Label className="text-xs">Always Free (no minimum)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          {!editing.always_free && (
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum Order Amount (£)</Label>
              <Input type="number" min={0} step="0.01" value={editing.min_order_amount} onChange={e => setEditing({ ...editing, min_order_amount: parseFloat(e.target.value) || 0 })} className="h-9 text-xs w-40" />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules?.map(r => {
          const zone = zones?.find(z => z.id === r.zone_id);
          return (
            <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-green-600" /> {r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.always_free ? "Always free" : `Min order: £${Number(r.min_order_amount).toFixed(2)}`}
                  {zone ? ` • ${zone.name}` : " • All zones"}
                  {r.is_wholesale ? " • Wholesale" : " • Retail"}
                  {!r.is_active ? " • Inactive" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...r })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutateAsync(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {(!rules || rules.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">No free shipping rules.</p>}
      </div>
    </div>
  );
};

/* ─── Main Shipping Settings Tab ─── */
const ShippingSettingsTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Shipping Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="zones" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 h-auto">
            <TabsTrigger value="zones" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" /> Zones</TabsTrigger>
            <TabsTrigger value="methods" className="text-xs gap-1.5"><Truck className="h-3.5 w-3.5" /> Methods</TabsTrigger>
            <TabsTrigger value="retail-rates" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Retail Rates</TabsTrigger>
            <TabsTrigger value="wholesale-rates" className="text-xs gap-1.5"><Users className="h-3.5 w-3.5" /> Wholesale Rates</TabsTrigger>
            <TabsTrigger value="retail-free" className="text-xs gap-1.5"><Gift className="h-3.5 w-3.5" /> Retail Free Ship</TabsTrigger>
            <TabsTrigger value="wholesale-free" className="text-xs gap-1.5"><Gift className="h-3.5 w-3.5" /> Wholesale Free Ship</TabsTrigger>
          </TabsList>

          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1">
            <p><strong>Priority:</strong> 1. Free Shipping Rule → 2. Role-Based Rate → 3. Zone-Based Rate → 4. Default (£3.99)</p>
            <p><strong>⚠️ Isolation:</strong> Retail rules NEVER apply to Wholesale users, and vice versa. Each role has completely separate rates and free shipping rules.</p>
          </div>

          <TabsContent value="zones"><ZonesPanel /></TabsContent>
          <TabsContent value="methods"><MethodsPanel /></TabsContent>
          <TabsContent value="retail-rates"><RatesPanel wholesaleOnly={false} /></TabsContent>
          <TabsContent value="wholesale-rates"><RatesPanel wholesaleOnly={true} /></TabsContent>
          <TabsContent value="retail-free"><FreeShippingPanel wholesaleOnly={false} /></TabsContent>
          <TabsContent value="wholesale-free"><FreeShippingPanel wholesaleOnly={true} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ShippingSettingsTab;
