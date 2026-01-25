import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  List, 
  LayoutGrid, 
  Phone, 
  Mail,
  Star,
  Wrench,
  Zap,
  Droplets,
  Wind,
  Leaf,
  Building,
  Bug,
  Sparkles,
  PaintBucket,
  Hammer,
  TreeDeciduous,
  CircleDot,
  FileUp,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CompanyDialog, parseVcf, type VcfData } from '@/components/CompanyDialog';
import { CompanyDetailDialog } from '@/components/CompanyDetailDialog';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { toast } from '@/hooks/useToast';
import type { Company } from '@/lib/types';

// Get icon based on service type
function getServiceIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('plumb')) return Droplets;
  if (lowerType.includes('electric')) return Zap;
  if (lowerType.includes('hvac') || lowerType.includes('heating') || lowerType.includes('cooling') || lowerType.includes('air')) return Wind;
  if (lowerType.includes('landscap') || lowerType.includes('lawn') || lowerType.includes('garden')) return Leaf;
  if (lowerType.includes('roof')) return Building;
  if (lowerType.includes('general') || lowerType.includes('contractor')) return Building;
  if (lowerType.includes('pest') || lowerType.includes('exterminator')) return Bug;
  if (lowerType.includes('clean')) return Sparkles;
  if (lowerType.includes('pool') || lowerType.includes('spa')) return Droplets;
  if (lowerType.includes('appliance')) return Wrench;
  if (lowerType.includes('handy')) return Hammer;
  if (lowerType.includes('paint')) return PaintBucket;
  if (lowerType.includes('floor')) return Building;
  if (lowerType.includes('tree')) return TreeDeciduous;
  if (lowerType.includes('septic') || lowerType.includes('sewer')) return CircleDot;
  return Users;
}

interface CompaniesTabProps {
  scrollTarget?: string;
}

export function CompaniesTab({ scrollTarget }: CompaniesTabProps) {
  const { data: companies = [], isLoading } = useCompanies();
  const { preferences, setCompaniesViewMode } = useUserPreferences();
  const viewMode = preferences.companiesViewMode;

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [viewingCompany, setViewingCompany] = useState<Company | undefined>();
  const [vcfImportData, setVcfImportData] = useState<VcfData | undefined>();

  // Collapsed types state (for list view)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Refs for service type sections
  const typeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const vcfInputRef = useRef<HTMLInputElement>(null);

  // Handle scroll to target when scrollTarget changes
  useEffect(() => {
    if (scrollTarget && scrollTarget.startsWith('type-') && !isLoading) {
      const typeName = scrollTarget.replace('type-', '');
      // Small delay to ensure the DOM has rendered
      const timer = setTimeout(() => {
        const element = typeRefs.current[typeName];
        if (element) {
          // Expand the type if it's collapsed (for list view)
          setCollapsedTypes(prev => {
            const newSet = new Set(prev);
            newSet.delete(typeName);
            return newSet;
          });
          // Scroll into view with offset for sticky header
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Adjust for sticky header (approximately 120px)
          setTimeout(() => {
            window.scrollBy({ top: -120, behavior: 'smooth' });
          }, 100);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollTarget, isLoading]);

  // Group companies by service type
  const companiesByType = useMemo(() => {
    const grouped: Record<string, Company[]> = {};

    for (const company of companies) {
      const type = company.serviceType || 'Uncategorized';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(company);
    }

    // Sort types alphabetically, but put "Uncategorized" and "Other" at the end
    const sortedTypes = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });

    return { grouped, sortedTypes };
  }, [companies]);

  const toggleType = (type: string) => {
    setCollapsedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setVcfImportData(undefined);
    setDialogOpen(true);
  };

  const handleAddManually = () => {
    setEditingCompany(undefined);
    setVcfImportData(undefined);
    setDialogOpen(true);
  };

  const handleVcfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = parseVcf(content);
      
      if (!data.name && !data.phone && !data.email) {
        toast({
          title: 'Import failed',
          description: 'Could not extract contact information from the VCF file.',
          variant: 'destructive',
        });
        return;
      }

      setEditingCompany(undefined);
      setVcfImportData(data);
      setDialogOpen(true);

      toast({
        title: 'Contact imported',
        description: `Imported "${data.name || 'contact'}". Please select a service type and review the details.`,
      });
    } catch (error) {
      console.error('VCF import error:', error);
      toast({
        title: 'Import failed',
        description: 'Could not read the VCF file. Please check the file format.',
        variant: 'destructive',
      });
    }

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Companies & Services
        </h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {companies.length > 0 && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setCompaniesViewMode(value as 'list' | 'card')}
              className="bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5"
            >
              <ToggleGroupItem 
                value="list" 
                aria-label="List view"
                className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm rounded-md px-2.5 py-1.5"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="card" 
                aria-label="Card view"
                className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm rounded-md px-2.5 py-1.5"
              >
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          {/* Hidden file input for VCF import */}
          <input
            type="file"
            accept=".vcf,.vcard"
            className="hidden"
            ref={vcfInputRef}
            onChange={handleVcfImport}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddManually}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Manually
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => vcfInputRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-2" />
                Import from Contact (.vcf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        viewMode === 'list' ? (
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <div className="pl-6 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-32 rounded-xl" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : companies.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-primary/30 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
              No Companies Yet
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Keep contact information, service history, and invoices for all your trusted companies and service providers.
            </p>
            <Button
              onClick={handleAddManually}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {companiesByType.sortedTypes.map((type) => {
              const TypeIcon = getServiceIcon(type);
              return (
                <div
                  key={type}
                  ref={(el) => { typeRefs.current[type] = el; }}
                >
                <Collapsible
                  open={!collapsedTypes.has(type)}
                  onOpenChange={() => toggleType(type)}
                  className="mb-2 last:mb-0"
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-primary/10 transition-colors">
                    {collapsedTypes.has(type) ? (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                    <TypeIcon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {type}
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {companiesByType.grouped[type].length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-8 py-2 space-y-1">
                      {companiesByType.grouped[type].map((company) => (
                        <button
                          key={company.id}
                          onClick={() => setViewingCompany(company)}
                          className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                        >
                          <span className="text-muted-foreground group-hover:text-primary font-medium">
                            {company.name}
                          </span>
                          {company.rating && (
                            <div className="flex items-center gap-0.5 ml-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= company.rating!
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {company.phone && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                              {company.phone}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="space-y-6">
          {companiesByType.sortedTypes.map((type) => {
            const TypeIcon = getServiceIcon(type);
            return (
              <Card 
                key={type} 
                ref={(el) => { typeRefs.current[type] = el; }}
                className="bg-card border-border overflow-hidden"
              >
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">{type}</span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {companiesByType.grouped[type].length} {companiesByType.grouped[type].length === 1 ? 'company' : 'companies'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companiesByType.grouped[type].map((company) => (
                      <CompanyCard
                        key={company.id}
                        company={company}
                        onClick={() => setViewingCompany(company)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CompanyDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCompany(undefined);
          setVcfImportData(undefined);
        }}
        company={editingCompany}
        initialData={vcfImportData}
      />

      {viewingCompany && (
        <CompanyDetailDialog
          isOpen={!!viewingCompany}
          onClose={() => setViewingCompany(undefined)}
          company={viewingCompany}
          onEdit={() => handleEditCompany(viewingCompany)}
          onDelete={() => setViewingCompany(undefined)}
        />
      )}
    </section>
  );
}

interface CompanyCardProps {
  company: Company;
  onClick: () => void;
}

function CompanyCard({ company, onClick }: CompanyCardProps) {
  const ServiceIcon = getServiceIcon(company.serviceType);
  
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col p-4 rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left"
    >
      {/* Icon & Rating */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <ServiceIcon className="h-5 w-5 text-primary" />
        </div>
        {company.rating && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${
                  star <= company.rating!
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {company.name}
      </h3>

      {/* Contact Info */}
      {company.phone && (
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
          <Phone className="h-3.5 w-3.5" />
          <span className="truncate">{company.phone}</span>
        </p>
      )}

      {company.email && (
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">{company.email}</span>
        </p>
      )}

      {/* Invoice Count */}
      {company.invoices && company.invoices.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
          {company.invoices.length} invoice{company.invoices.length === 1 ? '' : 's'} on file
        </p>
      )}

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </button>
  );
}
