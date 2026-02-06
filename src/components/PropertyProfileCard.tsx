/**
 * Property Profile card for the Home tab dashboard.
 * Single-property mode: one property (id "default"). See docs/MULTI_PROPERTY_PLAN.md for future multi-property.
 */
import { useState } from 'react';
import { Home, Pencil, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useProperty, usePropertyActions } from '@/hooks/useProperty';
import { useProperties } from '@/hooks/useProperty';
import { toast } from '@/hooks/useToast';
import type { Property } from '@/lib/types';

const WATER_SOURCE_OPTIONS = [
  { value: 'municipal', label: 'Municipal' },
  { value: 'well', label: 'Well' },
  { value: 'other', label: 'Other' },
] as const;

const SEWER_OPTIONS = [
  { value: 'municipal', label: 'Municipal' },
  { value: 'septic', label: 'Septic' },
  { value: 'other', label: 'Other' },
] as const;

const DEFAULT_PROPERTY_ID = 'default';

function emptyForm(): Omit<Property, 'id' | 'pubkey' | 'createdAt'> {
  return {
    name: '',
    yearBuilt: undefined,
    squareFootage: '',
    roofType: '',
    roofAge: '',
    hvacType: '',
    heatingCooling: '',
    lotSize: '',
    bedrooms: undefined,
    bathrooms: undefined,
    waterSource: undefined,
    sewerType: undefined,
    notes: '',
  };
}

export function PropertyProfileCard() {
  const property = useProperty();
  const { isLoading } = useProperties();
  const { createOrUpdateProperty } = usePropertyActions();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openEdit = () => {
    if (property) {
      setForm({
        name: property.name,
        yearBuilt: property.yearBuilt,
        squareFootage: property.squareFootage ?? '',
        roofType: property.roofType ?? '',
        roofAge: property.roofAge ?? '',
        hvacType: property.hvacType ?? '',
        heatingCooling: property.heatingCooling ?? '',
        lotSize: property.lotSize ?? '',
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        waterSource: property.waterSource,
        sewerType: property.sewerType,
        notes: property.notes ?? '',
      });
    } else {
      setForm(emptyForm());
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a property name or address.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await createOrUpdateProperty(DEFAULT_PROPERTY_ID, {
        ...form,
        name: form.name.trim(),
        yearBuilt: form.yearBuilt ?? undefined,
        squareFootage: (form.squareFootage ?? '').trim() || undefined,
        roofType: (form.roofType ?? '').trim() || undefined,
        roofAge: (form.roofAge ?? '').trim() || undefined,
        hvacType: (form.hvacType ?? '').trim() || undefined,
        heatingCooling: (form.heatingCooling ?? '').trim() || undefined,
        lotSize: (form.lotSize ?? '').trim() || undefined,
        bedrooms: form.bedrooms ?? undefined,
        bathrooms: form.bathrooms ?? undefined,
        waterSource: form.waterSource ?? undefined,
        sewerType: form.sewerType ?? undefined,
        notes: (form.notes ?? '').trim() || undefined,
      });
      toast({ title: 'Property saved', description: 'Your property profile has been updated.' });
      setEditOpen(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save property.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-theme-gradient-card border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyDetails =
    property &&
    (property.yearBuilt != null ||
      property.squareFootage ||
      property.roofType ||
      property.hvacType ||
      property.bedrooms != null ||
      property.bathrooms != null ||
      property.waterSource ||
      property.sewerType);

  return (
    <>
      <Card className="bg-theme-gradient-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="h-5 w-5 text-primary" />
              Property Profile
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={openEdit}>
              {property ? (
                <>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add property
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!property ? (
            <p className="text-muted-foreground text-sm">
              Add your home’s key details—year built, square footage, systems—for insurance, contractors, and records.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{property.name}</p>
              {hasAnyDetails ? (
                <ul className="text-muted-foreground space-y-0.5">
                  {property.yearBuilt != null && (
                    <li>Year built: {property.yearBuilt}</li>
                  )}
                  {property.squareFootage && (
                    <li>Square footage: {property.squareFootage}</li>
                  )}
                  {(property.bedrooms != null || property.bathrooms != null) && (
                    <li>
                      {[property.bedrooms != null && `${property.bedrooms} bed`, property.bathrooms != null && `${property.bathrooms} bath`]
                        .filter(Boolean)
                        .join(', ')}
                    </li>
                  )}
                  {property.roofType && (
                    <li>Roof: {property.roofType}{property.roofAge ? ` (${property.roofAge})` : ''}</li>
                  )}
                  {property.hvacType && (
                    <li>HVAC: {property.hvacType}</li>
                  )}
                  {(property.waterSource || property.sewerType) && (
                    <li>
                      Water: {property.waterSource ?? '—'} · Sewer: {property.sewerType ?? '—'}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-muted-foreground">No details yet. Edit to add year built, square footage, and more.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{property ? 'Edit property' : 'Add property'}</DialogTitle>
            <DialogDescription>
              Key facts about your home for insurance, contractors, and selling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prop-name">Name or address *</Label>
              <Input
                id="prop-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. 123 Main St or Primary Home"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prop-year">Year built</Label>
                <Input
                  id="prop-year"
                  type="number"
                  min={1800}
                  max={2100}
                  value={form.yearBuilt ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      yearBuilt: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    }))
                  }
                  placeholder="1990"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-sqft">Square footage</Label>
                <Input
                  id="prop-sqft"
                  value={form.squareFootage}
                  onChange={(e) => setForm((p) => ({ ...p, squareFootage: e.target.value }))}
                  placeholder="1,200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prop-beds">Bedrooms</Label>
                <Input
                  id="prop-beds"
                  type="number"
                  min={0}
                  value={form.bedrooms ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      bedrooms: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    }))
                  }
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-baths">Bathrooms</Label>
                <Input
                  id="prop-baths"
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.bathrooms ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      bathrooms: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-roof">Roof type</Label>
              <Input
                id="prop-roof"
                value={form.roofType}
                onChange={(e) => setForm((p) => ({ ...p, roofType: e.target.value }))}
                placeholder="e.g. Asphalt shingle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-roof-age">Roof age</Label>
              <Input
                id="prop-roof-age"
                value={form.roofAge}
                onChange={(e) => setForm((p) => ({ ...p, roofAge: e.target.value }))}
                placeholder="e.g. 5 years or 2020"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-hvac">HVAC type</Label>
              <Input
                id="prop-hvac"
                value={form.hvacType}
                onChange={(e) => setForm((p) => ({ ...p, hvacType: e.target.value }))}
                placeholder="e.g. Central air, heat pump"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-heat-cool">Heating / cooling</Label>
              <Input
                id="prop-heat-cool"
                value={form.heatingCooling}
                onChange={(e) => setForm((p) => ({ ...p, heatingCooling: e.target.value }))}
                placeholder="e.g. Gas furnace, central AC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-lot">Lot size</Label>
              <Input
                id="prop-lot"
                value={form.lotSize}
                onChange={(e) => setForm((p) => ({ ...p, lotSize: e.target.value }))}
                placeholder="e.g. 0.25 acres"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Water source</Label>
                <Select
                  value={form.waterSource ?? ''}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, waterSource: (v || undefined) as Property['waterSource'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {WATER_SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sewer</Label>
                <Select
                  value={form.sewerType ?? ''}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, sewerType: (v || undefined) as Property['sewerType'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEWER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prop-notes">Notes</Label>
              <Textarea
                id="prop-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Other details..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
