import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Package, Wrench, Calendar, Menu, Settings, Car, Shield, HelpCircle, Cloud, CreditCard, TreePine, Palette, RefreshCw, Coins, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import { RelayManagementDialog } from '@/components/RelayManagementDialog';
import { VehicleTypeManagementDialog } from '@/components/VehicleTypeManagementDialog';
import { SubscriptionTypeManagementDialog } from '@/components/SubscriptionTypeManagementDialog';
import { HomeFeatureManagementDialog } from '@/components/HomeFeatureManagementDialog';
import { WarrantyTypeManagementDialog } from '@/components/WarrantyTypeManagementDialog';
import { EncryptionSettingsDialog } from '@/components/EncryptionSettingsDialog';
import { StorageSettingsDialog } from '@/components/StorageSettingsDialog';
import { DisplaySettingsDialog } from '@/components/DisplaySettingsDialog';
import { CurrencySettingsDialog } from '@/components/CurrencySettingsDialog';
import { DonateSection } from '@/components/DonateSection';
import { TabNavigation } from '@/components/TabNavigation';
import { AddTabDialog } from '@/components/AddTabDialog';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { SearchButton } from '@/components/SearchButton';
import { CompanyDetailDialog } from '@/components/CompanyDetailDialog';
import { SubscriptionDetailDialog } from '@/components/SubscriptionDetailDialog';
import { WarrantyDetailDialog } from '@/components/WarrantyDetailDialog';
import { MaintenanceDetailDialog } from '@/components/MaintenanceDetailDialog';
import type { Company, Subscription, Warranty, MaintenanceSchedule } from '@/lib/types';
import {
  HomeTab,
  AppliancesTab,
  MaintenanceTab,
  VehiclesTab,
  SubscriptionsTab,
  WarrantiesTab,
  CompaniesTab,
  ProjectsTab,
} from '@/components/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTabPreferences, type TabId } from '@/hooks/useTabPreferences';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { useApplyColorTheme } from '@/hooks/useColorTheme';
import { useDataSyncStatus } from '@/hooks/useDataSyncStatus';

const Index = () => {
  useSeoMeta({
    title: 'Home Log - Home Ownership Management',
    description: 'Manage your home appliances and maintenance schedules with Nostr.',
  });

  const { user } = useCurrentUser();
  const { isProfileLoading } = useLoggedInAccounts();
  const { preferences, setActiveTab, isLoading: isPreferencesLoading } = useTabPreferences();
  const { isSynced: isDataSynced, hasCachedData, cacheChecked } = useDataSyncStatus();
  
  // Apply color theme to document root
  useApplyColorTheme();

  // Simple loading state:
  // Show loading if user is logged in AND we haven't finished the initial data load
  // Once either cache is found OR sync completes OR preferences load, we're done
  const hasLocalTabs = preferences.activeTabs.length > 0;
  
  const isInitialLoading = user && (
    isProfileLoading || 
    (!cacheChecked) ||
    (!hasLocalTabs && isPreferencesLoading) ||
    (!hasCachedData && !isDataSynced && !hasLocalTabs)
  );
  
  // Determine loading message
  const loadingMessage = "Loading your data...";
  const loadingSubMessage = "Fetching from Nostr relays";
  
  // Data sync is happening in background - show indicator but don't block UI
  // Only show this for users who HAVE cached data (so they're not blocked by the main loading)
  const isBackgroundSyncing = user && !isDataSynced && hasCachedData;

  // Dialog states
  const [roomManagementOpen, setRoomManagementOpen] = useState(false);
  const [relayManagementOpen, setRelayManagementOpen] = useState(false);
  const [relayManagementDefaultTab, setRelayManagementDefaultTab] = useState<'relays' | 'media'>('relays');
  const [vehicleTypeManagementOpen, setVehicleTypeManagementOpen] = useState(false);
  const [subscriptionTypeManagementOpen, setSubscriptionTypeManagementOpen] = useState(false);
  const [homeFeatureManagementOpen, setHomeFeatureManagementOpen] = useState(false);
  const [warrantyTypeManagementOpen, setWarrantyTypeManagementOpen] = useState(false);
  const [encryptionSettingsOpen, setEncryptionSettingsOpen] = useState(false);
  const [storageSettingsOpen, setStorageSettingsOpen] = useState(false);
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const [currencySettingsOpen, setCurrencySettingsOpen] = useState(false);
  const [addTabDialogOpen, setAddTabDialogOpen] = useState(false);
  
  // Global search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<Company | undefined>();
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | undefined>();
  const [viewingWarranty, setViewingWarranty] = useState<Warranty | undefined>();
  const [viewingMaintenance, setViewingMaintenance] = useState<MaintenanceSchedule | undefined>();
  
  // Scroll target state for navigating to specific sections within tabs
  const [scrollTarget, setScrollTarget] = useState<string | undefined>(undefined);

  const openRelayManagement = (tab: 'relays' | 'media' = 'relays') => {
    setRelayManagementDefaultTab(tab);
    setRelayManagementOpen(true);
  };

  const handleNavigateToTab = (tabId: TabId, target?: string) => {
    setScrollTarget(target);
    setActiveTab(tabId);
    // Clear the scroll target after a short delay so it can be re-triggered
    if (target) {
      setTimeout(() => setScrollTarget(undefined), 500);
    }
  };

  // Render all tabs but only show the active one
  // This keeps components mounted so queries don't re-run on tab switch
  const renderTabContent = () => {
    const activeTab = preferences.activeTab;
    const activeTabs = preferences.activeTabs;
    
    return (
      <>
        <div className={activeTab === 'home' ? '' : 'hidden'}>
          <HomeTab 
            onNavigateToTab={handleNavigateToTab} 
            onAddTab={() => setAddTabDialogOpen(true)} 
          />
        </div>
        {activeTabs.includes('appliances') && (
          <div className={activeTab === 'appliances' ? '' : 'hidden'}>
            <AppliancesTab scrollTarget={activeTab === 'appliances' ? scrollTarget : undefined} />
          </div>
        )}
        {activeTabs.includes('maintenance') && (
          <div className={activeTab === 'maintenance' ? '' : 'hidden'}>
            <MaintenanceTab scrollTarget={activeTab === 'maintenance' ? scrollTarget : undefined} />
          </div>
        )}
        {activeTabs.includes('vehicles') && (
          <div className={activeTab === 'vehicles' ? '' : 'hidden'}>
            <VehiclesTab scrollTarget={activeTab === 'vehicles' ? scrollTarget : undefined} />
          </div>
        )}
        {activeTabs.includes('subscriptions') && (
          <div className={activeTab === 'subscriptions' ? '' : 'hidden'}>
            <SubscriptionsTab scrollTarget={activeTab === 'subscriptions' ? scrollTarget : undefined} />
          </div>
        )}
        {activeTabs.includes('warranties') && (
          <div className={activeTab === 'warranties' ? '' : 'hidden'}>
            <WarrantiesTab />
          </div>
        )}
        {activeTabs.includes('companies') && (
          <div className={activeTab === 'companies' ? '' : 'hidden'}>
            <CompaniesTab scrollTarget={activeTab === 'companies' ? scrollTarget : undefined} />
          </div>
        )}
        {activeTabs.includes('projects') && (
          <div className={activeTab === 'projects' ? '' : 'hidden'}>
            <ProjectsTab />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      {/* Header + Tab Navigation - Combined sticky container */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <header>
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left - Menu & Logo */}
            <div className="flex items-center gap-3">
              {user && !isInitialLoading && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setRoomManagementOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Rooms
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVehicleTypeManagementOpen(true)}>
                      <Car className="h-4 w-4 mr-2" />
                      Vehicle Types
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSubscriptionTypeManagementOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Subscription Types
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHomeFeatureManagementOpen(true)}>
                      <TreePine className="h-4 w-4 mr-2" />
                      Home Features
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWarrantyTypeManagementOpen(true)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Warranty Types
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Privacy & Security</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEncryptionSettingsOpen(true)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Data Encryption
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStorageSettingsOpen(true)}>
                      <HardDrive className="h-4 w-4 mr-2" />
                      Browser Storage
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Display</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setDisplaySettingsOpen(true)}>
                      <Palette className="h-4 w-4 mr-2" />
                      Color Theme
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCurrencySettingsOpen(true)}>
                      <Coins className="h-4 w-4 mr-2" />
                      Currency
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Nostr Relays</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openRelayManagement('relays')}>
                      <Cloud className="h-4 w-4 mr-2" />
                      Configure
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Help</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/faq">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        FAQ & Data Info
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Home Log" className="h-10 w-10" />
                <span className="font-bold text-xl text-theme-heading">Home Log</span>
              </div>
            </div>

            {/* Right - Search, Theme Toggle & Login */}
            <div className="flex items-center gap-2">
              {user && !isInitialLoading && (
                <SearchButton onClick={() => setSearchOpen(true)} />
              )}
              <ThemeToggle />
              <LoginArea className="max-w-48" />
            </div>
          </div>
        </header>

        {/* Tab Navigation - Only shown when logged in and initial auth is complete */}
        {user && !isInitialLoading && (
          <TabNavigation onAddTabClick={() => setAddTabDialogOpen(true)} />
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isInitialLoading ? (
          // Initial loading - shows during profile fetch and initial data sync
          <LoadingAnimation 
            size="md"
            message={loadingMessage}
            subMessage={loadingSubMessage}
          />
        ) : !user ? (
          // Not logged in - Welcome screen
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-primary/10 mb-6 overflow-hidden">
                <img src="/logo.png" alt="Home Log" className="h-36 w-36 object-contain" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Welcome to Home Log
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                Keep track of home appliances, vehicle maintenance, general home maintenance, companies/service providers, subscriptions, warranties, and future home projects. Caring for your home has never been easier or more organized!
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <Package className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Track Everything</h3>
                  <p className="text-sm text-muted-foreground">
                    Appliances, vehicles, warranties, and companies all in one place.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <Wrench className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Never Miss a Task</h3>
                  <p className="text-sm text-muted-foreground">
                    Schedule maintenance for your home, vehicles, and subscriptions.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <Calendar className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Plan Ahead</h3>
                  <p className="text-sm text-muted-foreground">
                    Organize future projects and keep your home running smoothly.
                  </p>
                </CardContent>
              </Card>
            </div>

            <LoginArea className="justify-center" />

            <div className="mt-8 text-sm text-muted-foreground space-y-2">
              <p className="flex items-center justify-center gap-3 flex-wrap">
                <Link to="/faq" className="hover:text-primary transition-colors">
                  FAQ
                </Link>
                <span className="text-border">•</span>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-border">•</span>
                <Link to="/license" className="hover:text-primary transition-colors">
                  MIT License
                </Link>
              </p>
              <p>
                <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Vibed with Shakespeare
                </a>
              </p>
            </div>
          </div>
        ) : (
          // Logged in - Tab-based dashboard
          <div className="space-y-8">
            {/* Background sync indicator - subtle notification */}
            {isBackgroundSyncing && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-lg text-sm text-primary animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing your data from Nostr relays...</span>
              </div>
            )}
            
            {/* Tab Content */}
            {renderTabContent()}

            {/* Donate Section */}
            <section>
              <DonateSection />
            </section>

            {/* Footer */}
            <footer className="text-center py-8 text-sm text-muted-foreground space-y-2">
              <p className="flex items-center justify-center gap-3 flex-wrap">
                <Link to="/faq" className="hover:text-primary transition-colors">
                  FAQ
                </Link>
                <span className="text-border">•</span>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-border">•</span>
                <Link to="/license" className="hover:text-primary transition-colors">
                  MIT License
                </Link>
              </p>
              <p>
                <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Vibed with Shakespeare
                </a>
              </p>
            </footer>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <RoomManagementDialog
        isOpen={roomManagementOpen}
        onClose={() => setRoomManagementOpen(false)}
      />

      <RelayManagementDialog
        isOpen={relayManagementOpen}
        onClose={() => setRelayManagementOpen(false)}
        defaultTab={relayManagementDefaultTab}
      />

      <AddTabDialog
        isOpen={addTabDialogOpen}
        onClose={() => setAddTabDialogOpen(false)}
      />

      <VehicleTypeManagementDialog
        isOpen={vehicleTypeManagementOpen}
        onClose={() => setVehicleTypeManagementOpen(false)}
      />

      <SubscriptionTypeManagementDialog
        isOpen={subscriptionTypeManagementOpen}
        onClose={() => setSubscriptionTypeManagementOpen(false)}
      />

      <EncryptionSettingsDialog
        isOpen={encryptionSettingsOpen}
        onClose={() => setEncryptionSettingsOpen(false)}
      />

      <StorageSettingsDialog
        isOpen={storageSettingsOpen}
        onClose={() => setStorageSettingsOpen(false)}
      />

      <HomeFeatureManagementDialog
        isOpen={homeFeatureManagementOpen}
        onClose={() => setHomeFeatureManagementOpen(false)}
      />

      <WarrantyTypeManagementDialog
        isOpen={warrantyTypeManagementOpen}
        onClose={() => setWarrantyTypeManagementOpen(false)}
      />

      <DisplaySettingsDialog
        isOpen={displaySettingsOpen}
        onClose={() => setDisplaySettingsOpen(false)}
      />

      <CurrencySettingsDialog
        isOpen={currencySettingsOpen}
        onClose={() => setCurrencySettingsOpen(false)}
      />

      {/* Global Search */}
      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectCompany={setViewingCompany}
        onSelectSubscription={setViewingSubscription}
        onSelectWarranty={setViewingWarranty}
        onSelectMaintenance={setViewingMaintenance}
      />

      {/* Detail dialogs opened from search */}
      {viewingCompany && (
        <CompanyDetailDialog
          isOpen={!!viewingCompany}
          onClose={() => setViewingCompany(undefined)}
          company={viewingCompany}
          onEdit={() => {}} // View-only from search
          onDelete={() => setViewingCompany(undefined)}
        />
      )}

      {viewingSubscription && (
        <SubscriptionDetailDialog
          isOpen={!!viewingSubscription}
          onClose={() => setViewingSubscription(undefined)}
          subscription={viewingSubscription}
          onDelete={() => setViewingSubscription(undefined)}
        />
      )}

      {viewingWarranty && (
        <WarrantyDetailDialog
          isOpen={!!viewingWarranty}
          onClose={() => setViewingWarranty(undefined)}
          warranty={viewingWarranty}
          onEdit={() => {}} // View-only from search
          onDelete={() => setViewingWarranty(undefined)}
        />
      )}

      {viewingMaintenance && (
        <MaintenanceDetailDialog
          isOpen={!!viewingMaintenance}
          onClose={() => setViewingMaintenance(undefined)}
          maintenance={viewingMaintenance}
          onEdit={() => {}} // View-only from search
        />
      )}
    </div>
  );
};

export default Index;
