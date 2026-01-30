import { DollarSign, TrendingUp, TrendingDown, Minus, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBudgetSummary } from '@/hooks/useProjectMaterials';
import { EXPENSE_CATEGORIES } from '@/lib/types';

interface BudgetTrackerProps {
  projectId: string;
  originalBudget?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getCategoryLabel = (value: string) => {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'materials': return 'bg-blue-500';
    case 'labor': return 'bg-purple-500';
    case 'rentals': return 'bg-orange-500';
    case 'permits': return 'bg-red-500';
    case 'tools': return 'bg-slate-500';
    case 'delivery': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export function BudgetTracker({ projectId, originalBudget }: BudgetTrackerProps) {
  const {
    totalSpent,
    totalPlanned,
    budgetAmount,
    remaining,
    percentUsed,
    categoryBreakdown,
    isOverBudget,
  } = useBudgetSummary(projectId, originalBudget);

  const hasBudget = budgetAmount > 0;
  const hasExpenses = totalPlanned > 0;
  const categories = Object.entries(categoryBreakdown);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          Budget Tracker
        </CardTitle>
        {hasBudget && (
          <CardDescription>
            Tracking against {formatCurrency(budgetAmount)} budget
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Spent */}
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Spent</p>
            <p className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
              {formatCurrency(totalSpent)}
            </p>
          </div>

          {/* Budget / Planned */}
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">
              {hasBudget ? 'Budget' : 'Planned'}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(hasBudget ? budgetAmount : totalPlanned)}
            </p>
          </div>

          {/* Remaining / Difference */}
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">
              {hasBudget ? 'Remaining' : 'To Spend'}
            </p>
            <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              hasBudget 
                ? isOverBudget ? 'text-destructive' : 'text-green-600'
                : 'text-foreground'
            }`}>
              {hasBudget ? (
                <>
                  {isOverBudget ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  {formatCurrency(Math.abs(remaining))}
                </>
              ) : (
                formatCurrency(totalPlanned - totalSpent)
              )}
            </p>
          </div>
        </div>

        {/* Progress Bar (only if budget is set) */}
        {hasBudget && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget Used</span>
              <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
                {Math.min(percentUsed, 100).toFixed(0)}%
                {percentUsed > 100 && ` (${percentUsed.toFixed(0)}% of budget)`}
              </span>
            </div>
            <Progress 
              value={Math.min(percentUsed, 100)} 
              className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
            />
          </div>
        )}

        {/* Category Breakdown */}
        {hasExpenses && categories.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PieChart className="h-4 w-4" />
              Breakdown by Category
            </div>
            <div className="space-y-2">
              {categories.map(([category, { planned, spent }]) => {
                const categoryPercent = totalPlanned > 0 ? (planned / totalPlanned) * 100 : 0;
                const spentPercent = planned > 0 ? (spent / planned) * 100 : 0;
                
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                        <span>{getCategoryLabel(category)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(spent)}</span>
                        <span className="text-muted-foreground"> / {formatCurrency(planned)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div 
                        className={`${getCategoryColor(category)} rounded-full opacity-30`}
                        style={{ width: `${categoryPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No expenses message */}
        {!hasExpenses && (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No expenses tracked yet.</p>
            <p className="text-sm">Add materials or expenses to see budget tracking.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
