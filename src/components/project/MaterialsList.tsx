import { useState } from 'react';
import { Plus, Trash2, ShoppingCart, Check, Package, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useProjectMaterials, useProjectMaterialActions } from '@/hooks/useProjectMaterials';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/hooks/useToast';
import { EXPENSE_CATEGORIES, type ProjectMaterial, type ExpenseCategory } from '@/lib/types';

interface MaterialsListProps {
  projectId: string;
}

const getCategoryLabel = (value: string) => {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'materials': return 'bg-blue-100 text-blue-700';
    case 'labor': return 'bg-purple-100 text-purple-700';
    case 'rentals': return 'bg-orange-100 text-orange-700';
    case 'permits': return 'bg-red-100 text-red-700';
    case 'tools': return 'bg-slate-100 text-slate-700';
    case 'delivery': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export function MaterialsList({ projectId }: MaterialsListProps) {
  const { data: materials = [], isLoading } = useProjectMaterials(projectId);
  const { createMaterial, updateMaterial, toggleMaterialPurchased, deleteMaterial } = useProjectMaterialActions();
  const { formatForDisplay } = useCurrency();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ProjectMaterial | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'materials' as ExpenseCategory,
    quantity: '',
    unit: '',
    unitPrice: '',
    totalPrice: '',
    estimatedPrice: '',
    actualPrice: '',
    vendor: '',
    notes: '',
  });

  const unpurchasedMaterials = materials.filter(m => !m.isPurchased);
  const purchasedMaterials = materials.filter(m => m.isPurchased);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'materials',
      quantity: '',
      unit: '',
      unitPrice: '',
      totalPrice: '',
      estimatedPrice: '',
      actualPrice: '',
      vendor: '',
      notes: '',
    });
  };

  const openEditDialog = (material: ProjectMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      quantity: material.quantity != null ? String(material.quantity) : '',
      unit: material.unit ?? '',
      unitPrice: material.unitPrice ?? '',
      totalPrice: material.totalPrice,
      estimatedPrice: material.estimatedPrice ?? '',
      actualPrice: material.actualPrice ?? '',
      vendor: material.vendor ?? '',
      notes: material.notes ?? '',
    });
  };

  const closeEditDialog = () => {
    setEditingMaterial(null);
    resetForm();
  };

  const getTotalPriceForSave = () => {
    const est = formData.estimatedPrice.trim();
    const actual = formData.actualPrice.trim();
    const total = formData.totalPrice.trim();
    return total || est || actual || '0';
  };

  const handleAddMaterial = async () => {
    const totalPrice = getTotalPriceForSave();
    if (!formData.name.trim() || totalPrice === '0') {
      toast({
        title: 'Error',
        description: 'Please enter a name and at least one price (estimated or actual)',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      await createMaterial(projectId, {
        name: formData.name.trim(),
        category: formData.category,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit.trim() || undefined,
        unitPrice: formData.unitPrice.trim() || undefined,
        totalPrice,
        estimatedPrice: formData.estimatedPrice.trim() || undefined,
        actualPrice: formData.actualPrice.trim() || undefined,
        isPurchased: false,
        vendor: formData.vendor.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      resetForm();
      setShowAddDialog(false);
      toast({
        title: 'Item Added',
        description: 'Material has been added to your list.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add material',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial) return;
    const totalPrice = getTotalPriceForSave();
    if (!formData.name.trim() || totalPrice === '0') {
      toast({
        title: 'Error',
        description: 'Please enter a name and at least one price (estimated or actual)',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateMaterial(editingMaterial.id, projectId, {
        name: formData.name.trim(),
        category: formData.category,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit.trim() || undefined,
        unitPrice: formData.unitPrice.trim() || undefined,
        totalPrice,
        estimatedPrice: formData.estimatedPrice.trim() || undefined,
        actualPrice: formData.actualPrice.trim() || undefined,
        isPurchased: editingMaterial.isPurchased,
        purchasedDate: editingMaterial.purchasedDate,
        vendor: formData.vendor.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      closeEditDialog();
      toast({
        title: 'Item Updated',
        description: 'Material has been updated.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update material',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTogglePurchased = async (material: ProjectMaterial) => {
    try {
      await toggleMaterialPurchased(material);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update material',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteMaterial(materialId);
      toast({
        title: 'Item Deleted',
        description: 'Material has been removed.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete material',
        variant: 'destructive',
      });
    }
  };

  // Auto-calculate total when quantity and unit price change
  const handleQuantityOrPriceChange = (field: 'quantity' | 'unitPrice', value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    if (newFormData.quantity && newFormData.unitPrice) {
      const qty = parseFloat(newFormData.quantity);
      const price = parseFloat(newFormData.unitPrice.replace(/[^0-9.-]/g, ''));
      if (!isNaN(qty) && !isNaN(price)) {
        newFormData.totalPrice = (qty * price).toFixed(2);
      }
    }
    
    setFormData(newFormData);
  };

  const displayPrice = (m: ProjectMaterial) => {
    const est = m.estimatedPrice?.trim();
    const actual = m.actualPrice?.trim();
    if (est && actual) {
      return (
        <span className="flex flex-col items-end gap-0.5">
          <span className="text-muted-foreground text-xs">Est. {formatForDisplay(est)}</span>
          <span>Actual {formatForDisplay(actual)}</span>
        </span>
      );
    }
    if (actual) return formatForDisplay(actual);
    if (est) return formatForDisplay(est);
    return formatForDisplay(m.totalPrice);
  };

  const renderMaterialItem = (material: ProjectMaterial, isPurchased: boolean) => (
    <div
      key={material.id}
      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 group transition-colors ${
        isPurchased ? 'opacity-60' : ''
      }`}
    >
      <Checkbox
        checked={material.isPurchased}
        onCheckedChange={() => handleTogglePurchased(material)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium ${isPurchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {material.name}
          </span>
          <Badge className={`text-xs ${getCategoryColor(material.category)}`}>
            {getCategoryLabel(material.category)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          {material.quantity && material.unit && (
            <span>{material.quantity} {material.unit}</span>
          )}
          {material.vendor && (
            <span>from {material.vendor}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 font-semibold">
        {displayPrice(material)}
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => openEditDialog(material)}
          className="text-muted-foreground hover:text-foreground p-1 rounded"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDeleteMaterial(material.id)}
          className="text-muted-foreground hover:text-destructive p-1 rounded"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Materials & Expenses
              </CardTitle>
              <CardDescription>
                {unpurchasedMaterials.length} to buy, {purchasedMaterials.length} purchased
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No materials or expenses yet.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Unpurchased Items */}
              {unpurchasedMaterials.map((material) => renderMaterialItem(material, false))}

              {/* Purchased Items */}
              {purchasedMaterials.length > 0 && (
                <div className="pt-4 mt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Purchased
                  </p>
                  {purchasedMaterials.map((material) => renderMaterialItem(material, true))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Material Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Material or Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 2x4 Lumber"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as ExpenseCategory }))}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityOrPriceChange('quantity', e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="each"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price</Label>
                <Input
                  id="unitPrice"
                  value={formData.unitPrice}
                  onChange={(e) => handleQuantityOrPriceChange('unitPrice', e.target.value)}
                  placeholder="5.99"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPrice">Total Price</Label>
              <Input
                id="totalPrice"
                value={formData.totalPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, totalPrice: e.target.value }))}
                placeholder="59.90"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="estimatedPrice">Estimated Price</Label>
                <Input
                  id="estimatedPrice"
                  value={formData.estimatedPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                  placeholder="50.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualPrice">Actual Price</Label>
                <Input
                  id="actualPrice"
                  value={formData.actualPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualPrice: e.target.value }))}
                  placeholder="52.00"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use estimated for planning and actual after purchase to track variance.
            </p>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Store</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                placeholder="e.g., Home Depot"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMaterial} disabled={isAdding}>
              {isAdding ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Material or Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 2x4 Lumber"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as ExpenseCategory }))}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantityOrPriceChange('quantity', e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="each"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unitPrice">Unit Price</Label>
                <Input
                  id="edit-unitPrice"
                  value={formData.unitPrice}
                  onChange={(e) => handleQuantityOrPriceChange('unitPrice', e.target.value)}
                  placeholder="5.99"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-totalPrice">Total Price</Label>
              <Input
                id="edit-totalPrice"
                value={formData.totalPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, totalPrice: e.target.value }))}
                placeholder="59.90"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-estimatedPrice">Estimated Price</Label>
                <Input
                  id="edit-estimatedPrice"
                  value={formData.estimatedPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                  placeholder="50.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-actualPrice">Actual Price</Label>
                <Input
                  id="edit-actualPrice"
                  value={formData.actualPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualPrice: e.target.value }))}
                  placeholder="52.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-vendor">Vendor/Store</Label>
              <Input
                id="edit-vendor"
                value={formData.vendor}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                placeholder="e.g., Home Depot"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
