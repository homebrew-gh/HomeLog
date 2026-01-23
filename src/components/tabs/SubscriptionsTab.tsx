import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function SubscriptionsTab() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          Subscriptions
        </h2>
        <Button
          className="bg-sky-600 hover:bg-sky-700 text-white"
          disabled
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 border-dashed">
        <CardContent className="py-12 text-center">
          <CreditCard className="h-12 w-12 text-sky-300 dark:text-sky-700 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Coming Soon
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Keep track of all your recurring subscriptions, billing dates, costs, and manage renewals efficiently.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
