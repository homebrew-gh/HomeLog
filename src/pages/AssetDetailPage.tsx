import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import {
  ArrowLeft,
  Package,
  Car,
  Plane,
  Ship,
  Tractor,
  Factory,
  Calendar,
  DollarSign,
  Home,
  FileText,
  Image,
  Wrench,
  Shield,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Hash,
  Gauge,
  Fuel,
  StickyNote,
  Edit,
  TreePine,
  Users,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  ScrollText,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BlossomDocumentLink } from '@/components/BlossomMedia';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppliances, useApplianceById } from '@/hooks/useAppliances';
import { useVehicles, useVehicleById } from '@/hooks/useVehicles';
import { useMaintenance, useMaintenanceByAppliance, useMaintenanceByVehicle, useMaintenanceByCompanyId, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
import { useWarranties, useWarrantiesByApplianceId, useWarrantiesByVehicleId, useWarrantiesByCompanyId, formatWarrantyTimeRemaining, isWarrantyExpired, isWarrantyExpiringSoon } from '@/hooks/useWarranties';
import { useCompanyById, useCompanies } from '@/hooks/useCompanies';
import { useSubscriptionsByCompanyId, useSubscriptions } from '@/hooks/useSubscriptions';
import { FUEL_TYPES, type MaintenanceSchedule, type Warranty, type Company, type Subscription } from '@/lib/types';
import NotFound from './NotFound';

// Get icon based on vehicle type
function getVehicleIcon(type: string) {
  switch (type) {
    case 'Plane':
      return Plane;
    case 'Boat':
      return Ship;
    case 'Farm Machinery':
      return Tractor;
    default:
      return Car;
  }
}

// Get fuel type label
function getFuelTypeLabel(value: string): string {
  const fuelType = FUEL_TYPES.find(f => f.value === value);
  return fuelType?.label || value;
}

// Parse date string to get a purchase date for maintenance calculations
function getStartDateForMaintenance(purchaseDate?: string): string {
  return purchaseDate || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

// MaintenanceSection component
function MaintenanceSection({ 
  maintenance, 
  startDate,
  companies,
}: { 
  maintenance: MaintenanceSchedule[];
  startDate: string;
  companies: Company[];
}) {
  const { data: completions = [] } = useMaintenanceCompletions();

  return (
    <div className="space-y-4">
      {maintenance.map((schedule) => {
        const scheduleCompletions = completions.filter(c => c.maintenanceId === schedule.id);
        const lastCompletion = scheduleCompletions[0];
        const nextDue = calculateNextDueDate(
          startDate,
          schedule.frequency,
          schedule.frequencyUnit,
          lastCompletion?.completedDate
        );
        const overdue = isOverdue(startDate, schedule.frequency, schedule.frequencyUnit, lastCompletion?.completedDate);
        const dueSoon = isDueSoon(startDate, schedule.frequency, schedule.frequencyUnit, lastCompletion?.completedDate);
        
        const company = schedule.companyId ? companies.find(c => c.id === schedule.companyId) : undefined;

        return (
          <Card key={schedule.id} className={overdue ? 'border-destructive/50 bg-destructive/5' : dueSoon ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{schedule.description}</h4>
                    {overdue && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    )}
                    {dueSoon && !overdue && (
                      <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due Soon
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Every {schedule.frequency} {schedule.frequencyUnit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Next due: {formatDueDate(nextDue)}</span>
                    </div>
                    {schedule.partNumber && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>Part: {schedule.partNumber}</span>
                      </div>
                    )}
                    {schedule.mileageInterval && (
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        <span>Every {schedule.mileageInterval.toLocaleString()} {schedule.intervalType === 'hours' ? 'hours' : 'miles'}</span>
                      </div>
                    )}
                    {company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{company.name}</span>
                      </div>
                    )}
                  </div>

                  {lastCompletion && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Last completed: {lastCompletion.completedDate}</span>
                        {lastCompletion.mileageAtCompletion && (
                          <span className="text-muted-foreground">at {lastCompletion.mileageAtCompletion} miles</span>
                        )}
                      </div>
                      {lastCompletion.notes && (
                        <p className="text-sm text-muted-foreground mt-1 pl-6">{lastCompletion.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// WarrantySection component
function WarrantySection({ warranties }: { warranties: Warranty[] }) {
  return (
    <div className="space-y-4">
      {warranties.map((warranty) => {
        const expired = isWarrantyExpired(warranty);
        const expiringSoon = isWarrantyExpiringSoon(warranty);
        const timeRemaining = formatWarrantyTimeRemaining(warranty);

        return (
          <Card key={warranty.id} className={expired ? 'border-destructive/50 bg-destructive/5' : expiringSoon ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{warranty.name}</h4>
                    <Badge variant="outline">{warranty.warrantyType}</Badge>
                    {expired && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                    {expiringSoon && !expired && (
                      <Badge className="bg-amber-100 text-amber-700">Expiring Soon</Badge>
                    )}
                  </div>

                  {warranty.description && (
                    <p className="text-sm text-muted-foreground mb-2">{warranty.description}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{timeRemaining}</span>
                    </div>
                    {warranty.warrantyEndDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Expires: {warranty.warrantyEndDate}</span>
                      </div>
                    )}
                    {warranty.purchasePrice && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Paid: {warranty.purchasePrice}</span>
                      </div>
                    )}
                    {warranty.companyName && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{warranty.companyName}</span>
                      </div>
                    )}
                    {warranty.isRegistered && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Registered</span>
                      </div>
                    )}
                  </div>

                  {warranty.hasExtendedWarranty && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="font-medium text-primary">Extended Warranty</span>
                        {warranty.extendedWarrantyProvider && (
                          <span className="text-muted-foreground"> by {warranty.extendedWarrantyProvider}</span>
                        )}
                        {warranty.extendedWarrantyEndDate && (
                          <span className="text-muted-foreground"> until {warranty.extendedWarrantyEndDate}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {warranty.documents && warranty.documents.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {warranty.documents.map((doc, index) => (
                          <BlossomDocumentLink
                            key={index}
                            href={doc.url}
                            name={doc.name || `Document ${index + 1}`}
                            icon={<FileText className="h-3 w-3" />}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// CompanySection component
function CompanySection({ companyIds, companies }: { companyIds: string[]; companies: Company[] }) {
  const linkedCompanies = companies.filter(c => companyIds.includes(c.id));

  return (
    <div className="space-y-4">
      {linkedCompanies.map((company) => (
        <Card key={company.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{company.name}</h4>
                  <Badge variant="outline">{company.serviceType}</Badge>
                  {company.rating && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      {'★'.repeat(company.rating)}{'☆'.repeat(5 - company.rating)}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {company.contactName && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Contact:</span>
                      <span>{company.contactName}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2">
                      <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                        {company.phone}
                      </a>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                        {company.email}
                      </a>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {(company.address || company.city) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {[company.address, company.city, company.state, company.zipCode].filter(Boolean).join(', ')}
                  </p>
                )}

                {company.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{company.notes}"</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// SubscriptionSection component
function SubscriptionSection({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <Card key={subscription.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{subscription.name}</h4>
                  <Badge variant="outline">{subscription.subscriptionType}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-lg text-primary">
                    {subscription.cost}
                    {subscription.currency && ` ${subscription.currency}`}
                  </span>
                  <span className="text-muted-foreground">/ {subscription.billingFrequency}</span>
                </div>

                {subscription.companyName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Provider: {subscription.companyName}
                  </p>
                )}

                {subscription.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">"{subscription.notes}"</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Appliance Detail Content
function ApplianceDetailContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const { isLoading: isAppliancesLoading } = useAppliances();
  const appliance = useApplianceById(id);
  const maintenance = useMaintenanceByAppliance(id);
  const warranties = useWarrantiesByApplianceId(id);
  const { data: companies = [] } = useCompanies();
  const { data: subscriptions = [] } = useSubscriptions();

  // Get company IDs from maintenance and warranties
  const companyIds = [
    ...maintenance.filter(m => m.companyId).map(m => m.companyId!),
    ...warranties.filter(w => w.companyId).map(w => w.companyId!),
  ];
  const uniqueCompanyIds = [...new Set(companyIds)];

  // Get subscriptions linked to any of these companies
  const linkedSubscriptions = subscriptions.filter(
    s => s.companyId && uniqueCompanyIds.includes(s.companyId)
  );

  useSeoMeta({
    title: appliance ? `${appliance.model} - Cypher Log` : 'Appliance Details - Cypher Log',
    description: appliance ? `Details for ${appliance.model}${appliance.manufacturer ? ` by ${appliance.manufacturer}` : ''}` : 'View appliance details',
  });

  if (isAppliancesLoading) {
    return <LoadingSkeleton />;
  }

  if (!appliance) {
    return <NotFound />;
  }

  const startDate = getStartDateForMaintenance(appliance.purchaseDate);

  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{appliance.model}</h1>
                  {appliance.manufacturer && (
                    <p className="text-sm text-muted-foreground">{appliance.manufacturer}</p>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link to="/?tab=appliances">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Basic Info Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Appliance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appliance.manufacturer && (
                <div className="flex items-start gap-3">
                  <Factory className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Manufacturer</p>
                    <p>{appliance.manufacturer}</p>
                  </div>
                </div>
              )}

              {appliance.room && (
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Room</p>
                    <p>{appliance.room}</p>
                  </div>
                </div>
              )}

              {appliance.purchaseDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                    <p>{appliance.purchaseDate}</p>
                  </div>
                </div>
              )}

              {appliance.price && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Purchase Price</p>
                    <p>{appliance.price}</p>
                  </div>
                </div>
              )}

              {appliance.receiptUrl && (
                <div className="flex items-start gap-3">
                  <Image className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receipt</p>
                    <BlossomDocumentLink
                      href={appliance.receiptUrl}
                      name="View Receipt"
                      icon={null}
                    />
                  </div>
                </div>
              )}

              {appliance.manualUrl && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Manual</p>
                    <BlossomDocumentLink
                      href={appliance.manualUrl}
                      name="View Manual"
                      icon={null}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Maintenance Section */}
        {maintenance.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Maintenance Schedules
                </CardTitle>
                <CardDescription>
                  {maintenance.length} maintenance schedule{maintenance.length !== 1 ? 's' : ''} for this appliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceSection maintenance={maintenance} startDate={startDate} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Warranties Section */}
        {warranties.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Warranties
                </CardTitle>
                <CardDescription>
                  {warranties.length} warrant{warranties.length !== 1 ? 'ies' : 'y'} linked to this appliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarrantySection warranties={warranties} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Companies Section */}
        {uniqueCompanyIds.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Service Providers
                </CardTitle>
                <CardDescription>
                  {uniqueCompanyIds.length} compan{uniqueCompanyIds.length !== 1 ? 'ies' : 'y'} linked through maintenance or warranties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanySection companyIds={uniqueCompanyIds} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Subscriptions Section */}
        {linkedSubscriptions.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Related Subscriptions
                </CardTitle>
                <CardDescription>
                  {linkedSubscriptions.length} subscription{linkedSubscriptions.length !== 1 ? 's' : ''} from linked companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionSection subscriptions={linkedSubscriptions} />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

// Vehicle Detail Content
function VehicleDetailContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const { isLoading: isVehiclesLoading } = useVehicles();
  const vehicle = useVehicleById(id);
  const maintenance = useMaintenanceByVehicle(id);
  const warranties = useWarrantiesByVehicleId(id);
  const { data: companies = [] } = useCompanies();
  const { data: subscriptions = [] } = useSubscriptions();

  // Get company IDs from maintenance and warranties
  const companyIds = [
    ...maintenance.filter(m => m.companyId).map(m => m.companyId!),
    ...warranties.filter(w => w.companyId).map(w => w.companyId!),
  ];
  const uniqueCompanyIds = [...new Set(companyIds)];

  // Get subscriptions linked to any of these companies
  const linkedSubscriptions = subscriptions.filter(
    s => s.companyId && uniqueCompanyIds.includes(s.companyId)
  );

  useSeoMeta({
    title: vehicle ? `${vehicle.name} - Cypher Log` : 'Vehicle Details - Cypher Log',
    description: vehicle ? `Details for ${vehicle.name}` : 'View vehicle details',
  });

  if (isVehiclesLoading) {
    return <LoadingSkeleton />;
  }

  if (!vehicle) {
    return <NotFound />;
  }

  const VehicleIcon = getVehicleIcon(vehicle.vehicleType);
  const startDate = getStartDateForMaintenance(vehicle.purchaseDate);

  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <VehicleIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{vehicle.name}</h1>
                    <Badge variant="secondary">{vehicle.vehicleType}</Badge>
                  </div>
                  {(vehicle.make || vehicle.model || vehicle.year) && (
                    <p className="text-sm text-muted-foreground">
                      {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link to="/?tab=vehicles">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Basic Info Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <VehicleIcon className="h-5 w-5 text-primary" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(vehicle.make || vehicle.model || vehicle.year) && (
                <div className="flex items-start gap-3">
                  <Factory className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Make / Model / Year</p>
                    <p>{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</p>
                  </div>
                </div>
              )}

              {vehicle.licensePlate && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">License Plate</p>
                    <p>{vehicle.licensePlate}</p>
                  </div>
                </div>
              )}

              {vehicle.serialNumber && (
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                    <p className="font-mono text-sm">{vehicle.serialNumber}</p>
                  </div>
                </div>
              )}

              {vehicle.hullId && (
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hull ID (HIN)</p>
                    <p className="font-mono text-sm">{vehicle.hullId}</p>
                  </div>
                </div>
              )}

              {vehicle.tailNumber && (
                <div className="flex items-start gap-3">
                  <Plane className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tail Number</p>
                    <p className="font-mono text-sm">{vehicle.tailNumber}</p>
                  </div>
                </div>
              )}

              {(vehicle.mileage || vehicle.engineHours || vehicle.hobbsTime) && (
                <div className="flex items-start gap-3">
                  <Gauge className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {vehicle.hobbsTime ? 'Hobbs Time' : vehicle.engineHours ? 'Engine Hours' : 'Mileage'}
                    </p>
                    <p>
                      {vehicle.hobbsTime ? `${vehicle.hobbsTime} hours` :
                       vehicle.engineHours ? `${vehicle.engineHours} hours` :
                       `${vehicle.mileage} miles`}
                    </p>
                  </div>
                </div>
              )}

              {vehicle.fuelType && (
                <div className="flex items-start gap-3">
                  <Fuel className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fuel Type</p>
                    <p>{getFuelTypeLabel(vehicle.fuelType)}</p>
                  </div>
                </div>
              )}

              {vehicle.purchaseDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                    <p>{vehicle.purchaseDate}</p>
                  </div>
                </div>
              )}

              {vehicle.purchasePrice && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Purchase Price</p>
                    <p>{vehicle.purchasePrice}</p>
                  </div>
                </div>
              )}

              {vehicle.purchaseLocation && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Where Bought</p>
                    <p>{vehicle.purchaseLocation}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Registration Section */}
        {vehicle.registrationExpiry && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Registration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Registration Expiry</p>
                    <p>{vehicle.registrationExpiry}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Documents Section */}
        {(vehicle.receiptUrl || vehicle.warrantyUrl || (vehicle.documentsUrls && vehicle.documentsUrls.length > 0)) && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicle.receiptUrl && (
                  <BlossomDocumentLink
                    href={vehicle.receiptUrl}
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-foreground"
                    showIcon={false}
                  >
                    <Image className="h-5 w-5 text-primary" />
                    <span>View Receipt</span>
                  </BlossomDocumentLink>
                )}
                {vehicle.warrantyUrl && (
                  <BlossomDocumentLink
                    href={vehicle.warrantyUrl}
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-foreground"
                    showIcon={false}
                  >
                    <Shield className="h-5 w-5 text-primary" />
                    <span>View Warranty Document</span>
                  </BlossomDocumentLink>
                )}
                {vehicle.documentsUrls?.map((url, index) => (
                  <BlossomDocumentLink
                    key={index}
                    href={url}
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-foreground"
                    showIcon={false}
                  >
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Document {index + 1}</span>
                  </BlossomDocumentLink>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Notes Section */}
        {vehicle.notes && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{vehicle.notes}</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Maintenance Section */}
        {maintenance.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Maintenance Schedules
                </CardTitle>
                <CardDescription>
                  {maintenance.length} maintenance schedule{maintenance.length !== 1 ? 's' : ''} for this vehicle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceSection maintenance={maintenance} startDate={startDate} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Warranties Section */}
        {warranties.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Warranties
                </CardTitle>
                <CardDescription>
                  {warranties.length} warrant{warranties.length !== 1 ? 'ies' : 'y'} linked to this vehicle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarrantySection warranties={warranties} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Companies Section */}
        {uniqueCompanyIds.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Service Providers
                </CardTitle>
                <CardDescription>
                  {uniqueCompanyIds.length} compan{uniqueCompanyIds.length !== 1 ? 'ies' : 'y'} linked through maintenance or warranties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanySection companyIds={uniqueCompanyIds} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Subscriptions Section */}
        {linkedSubscriptions.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Related Subscriptions
                </CardTitle>
                <CardDescription>
                  {linkedSubscriptions.length} subscription{linkedSubscriptions.length !== 1 ? 's' : ''} from linked companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionSection subscriptions={linkedSubscriptions} />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

// Home Feature Detail Content
function HomeFeatureDetailContent({ featureName }: { featureName: string }) {
  const navigate = useNavigate();
  const { data: allMaintenance = [] } = useMaintenance();
  const { data: allWarranties = [] } = useWarranties();
  const { data: companies = [] } = useCompanies();
  const { data: subscriptions = [] } = useSubscriptions();

  // Filter maintenance schedules for this home feature
  const maintenance = allMaintenance.filter(m => m.homeFeature === featureName && !m.applianceId && !m.vehicleId);
  
  // Filter warranties for this home feature
  const warranties = allWarranties.filter(w => w.linkedType === 'home_feature' && w.linkedItemName === featureName);

  // Filter subscriptions linked to this home feature
  const linkedSubscriptions = subscriptions.filter(
    s => s.linkedAssetType === 'home_feature' && s.linkedAssetName === featureName
  );

  // Get company IDs from maintenance and warranties
  const companyIds = [
    ...maintenance.filter(m => m.companyId).map(m => m.companyId!),
    ...warranties.filter(w => w.companyId).map(w => w.companyId!),
  ];
  const uniqueCompanyIds = [...new Set(companyIds)];

  useSeoMeta({
    title: `${featureName} - Cypher Log`,
    description: `Details for ${featureName} home feature`,
  });

  const startDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TreePine className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{featureName}</h1>
                  <p className="text-sm text-muted-foreground">Home Feature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Basic Info Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" />
                Home Feature Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Feature Name</p>
                  <p>{featureName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Maintenance Section */}
        {maintenance.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Maintenance Schedules
                </CardTitle>
                <CardDescription>
                  {maintenance.length} maintenance schedule{maintenance.length !== 1 ? 's' : ''} for this home feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceSection maintenance={maintenance} startDate={startDate} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Warranties Section */}
        {warranties.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Warranties
                </CardTitle>
                <CardDescription>
                  {warranties.length} warrant{warranties.length !== 1 ? 'ies' : 'y'} linked to this home feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarrantySection warranties={warranties} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Companies Section */}
        {uniqueCompanyIds.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Service Providers
                </CardTitle>
                <CardDescription>
                  {uniqueCompanyIds.length} compan{uniqueCompanyIds.length !== 1 ? 'ies' : 'y'} linked through maintenance or warranties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanySection companyIds={uniqueCompanyIds} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Subscriptions Section */}
        {linkedSubscriptions.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Related Subscriptions
                </CardTitle>
                <CardDescription>
                  {linkedSubscriptions.length} subscription{linkedSubscriptions.length !== 1 ? 's' : ''} linked to this home feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionSection subscriptions={linkedSubscriptions} />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

// Company Detail Content
function CompanyDetailContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: companies = [], isLoading: isCompaniesLoading } = useCompanies();
  const company = useCompanyById(id);
  const maintenance = useMaintenanceByCompanyId(id);
  const warranties = useWarrantiesByCompanyId(id);
  const subscriptions = useSubscriptionsByCompanyId(id);
  const { data: allAppliances = [] } = useAppliances();
  const { data: allVehicles = [] } = useVehicles();

  // Get linked appliances and vehicles from maintenance schedules
  const linkedApplianceIds = [...new Set(maintenance.filter(m => m.applianceId).map(m => m.applianceId!))];
  const linkedVehicleIds = [...new Set(maintenance.filter(m => m.vehicleId).map(m => m.vehicleId!))];
  const linkedAppliances = allAppliances.filter(a => linkedApplianceIds.includes(a.id));
  const linkedVehicles = allVehicles.filter(v => linkedVehicleIds.includes(v.id));

  // Get home features from maintenance
  const linkedHomeFeatures = [...new Set(maintenance.filter(m => m.homeFeature).map(m => m.homeFeature!))];

  useSeoMeta({
    title: company ? `${company.name} - Cypher Log` : 'Company Details - Cypher Log',
    description: company ? `Details for ${company.name}${company.serviceType ? ` - ${company.serviceType}` : ''}` : 'View company details',
  });

  if (isCompaniesLoading) {
    return <LoadingSkeleton />;
  }

  if (!company) {
    return <NotFound />;
  }

  const startDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{company.name}</h1>
                    {company.rating && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= company.rating!
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {company.serviceType && (
                    <p className="text-sm text-muted-foreground">{company.serviceType}</p>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link to="/?tab=companies">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Basic Info Section */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {company.contactName && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                    <p>{company.contactName}</p>
                  </div>
                </div>
              )}

              {company.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}

              {company.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                      {company.email}
                    </a>
                  </div>
                </div>
              )}

              {company.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Website</p>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {(company.address || company.city || company.state || company.zipCode) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>
                      {[company.address, company.city, company.state, company.zipCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {company.licenseNumber && (
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">License Number</p>
                    <p className="font-mono text-sm">{company.licenseNumber}</p>
                  </div>
                </div>
              )}

              {company.insuranceInfo && (
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Insurance Information</p>
                    <p>{company.insuranceInfo}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Notes Section */}
        {company.notes && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{company.notes}</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Invoices Section */}
        {company.invoices && company.invoices.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  Invoices
                </CardTitle>
                <CardDescription>
                  {company.invoices.length} invoice{company.invoices.length !== 1 ? 's' : ''} on file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.invoices.map((invoice, index) => (
                    <BlossomDocumentLink
                      key={index}
                      href={invoice.url}
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-foreground"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {invoice.description || `Invoice ${index + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.date}
                          {invoice.amount && ` • ${invoice.amount}`}
                        </p>
                      </div>
                    </BlossomDocumentLink>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Linked Assets Section */}
        {(linkedAppliances.length > 0 || linkedVehicles.length > 0 || linkedHomeFeatures.length > 0) && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Linked Assets
                </CardTitle>
                <CardDescription>
                  Assets that this company services or has worked on
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkedAppliances.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Appliances
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {linkedAppliances.map((appliance) => (
                        <Link
                          key={appliance.id}
                          to={`/asset/appliance/${appliance.id}`}
                          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{appliance.model}</p>
                            {appliance.room && (
                              <p className="text-sm text-muted-foreground truncate">{appliance.room}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {linkedVehicles.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      Vehicles
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {linkedVehicles.map((vehicle) => (
                        <Link
                          key={vehicle.id}
                          to={`/asset/vehicle/${vehicle.id}`}
                          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Car className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{vehicle.name}</p>
                            {vehicle.vehicleType && (
                              <p className="text-sm text-muted-foreground truncate">{vehicle.vehicleType}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {linkedHomeFeatures.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <TreePine className="h-4 w-4 text-primary" />
                      Home Features
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {linkedHomeFeatures.map((feature) => (
                        <Link
                          key={feature}
                          to={`/asset/home-feature/${encodeURIComponent(feature)}`}
                          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <TreePine className="h-4 w-4 text-primary shrink-0" />
                          <p className="font-medium truncate">{feature}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Maintenance Section */}
        {maintenance.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Maintenance Schedules
                </CardTitle>
                <CardDescription>
                  {maintenance.length} maintenance schedule{maintenance.length !== 1 ? 's' : ''} assigned to this company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceSection maintenance={maintenance} startDate={startDate} companies={companies} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Warranties Section */}
        {warranties.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Warranties
                </CardTitle>
                <CardDescription>
                  {warranties.length} warrant{warranties.length !== 1 ? 'ies' : 'y'} linked to this company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarrantySection warranties={warranties} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Subscriptions Section */}
        {subscriptions.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Subscriptions
                </CardTitle>
                <CardDescription>
                  {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} with this company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionSection subscriptions={subscriptions} />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

// Main Page Component
export function AssetDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { user } = useCurrentUser();

  // Require login
  if (!user) {
    return (
      <div className="min-h-screen bg-theme-gradient tool-pattern-bg flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Please log in to view your asset details.
            </p>
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!id) {
    return <NotFound />;
  }

  if (type === 'appliance') {
    return <ApplianceDetailContent id={id} />;
  }

  if (type === 'vehicle') {
    return <VehicleDetailContent id={id} />;
  }

  if (type === 'home-feature') {
    const featureName = decodeURIComponent(id);
    return <HomeFeatureDetailContent featureName={featureName} />;
  }

  if (type === 'company') {
    return <CompanyDetailContent id={id} />;
  }

  return <NotFound />;
}

export default AssetDetailPage;
