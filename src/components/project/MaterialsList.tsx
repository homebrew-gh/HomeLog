import { useState } from 'react';
import { Plus, Trash2, ShoppingCart, Check, Package } from 'lucide-react';
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
  const { createMaterial, toggleMaterialPurchased, deleteMaterial } = useProjectMaterialActions();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'materials' as ExpenseCategory,
    quantity: '',
    unit: '',
    unitPrice: '',
    totalPrice: '',
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
      vendor: '',
      notes: '',
    });
  };

  const handleAddMaterial = async () => {
    if (!formData.name.trim() || !formData.totalPrice.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name and price',
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
        totalPrice: formData.totalPrice.trim(),
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
      <div className="text-right shrink-0">
        <span className={`font-semibold ${isPurchased ? 'text-muted-foreground' : 'text-foreground'}`}>
          ${material.totalPrice}
        </span>
      </div>
      <button
        onClick={() => handleDeleteMaterial(material.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
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
              <Label htmlFor="totalPrice">Total Price *</Label>
              <Input
                id="totalPrice"
                value={formData.totalPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, totalPrice: e.target.value }))}
                placeholder="59.90"
              />
            </div>

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
    </>
  );
}
