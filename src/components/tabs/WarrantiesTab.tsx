import { Shield, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function WarrantiesTab() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Warranties
        </h2>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Warranty
        </Button>
      </div>

      <Card className="bg-card border-border border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 text-primary/30 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">
            Coming Soon
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Store warranty documents, track expiration dates, and never miss a coverage deadline again.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
