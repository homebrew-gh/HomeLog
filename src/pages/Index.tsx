import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Home, Package, Wrench, Calendar, Menu, Settings, Wifi, Car, Shield, HelpCircle, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import { RelayManagementDialog } from '@/components/RelayManagementDialog';
import { VehicleTypeManagementDialog } from '@/components/VehicleTypeManagementDialog';
import { EncryptionSettingsDialog } from '@/components/EncryptionSettingsDialog';
import { DonateSection } from '@/components/DonateSection';
import { TabNavigation } from '@/components/TabNavigation';
import { AddTabDialog } from '@/components/AddTabDialog';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import {
  HomeTab,
  AppliancesTab,
  MaintenanceTab,
  VehiclesTab,
  SubscriptionsTab,
  WarrantiesTab,
  ContractorsTab,
  ProjectsTab,
} from '@/components/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTabPreferences, type TabId } from '@/hooks/useTabPreferences';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';

const Index = () => {
  useSeoMeta({
    title: 'Home Log - Home Ownership Management',
    description: 'Manage your home appliances and maintenance schedules with Nostr.',
  });

  const { user } = useCurrentUser();
  const { isProfileLoading } = useLoggedInAccounts();
  const { preferences, setActiveTab, isLoading: isPreferencesLoading } = useTabPreferences();

  // Combined loading state - show loading animation until both profile AND preferences are fully loaded
  const isDataLoading = isProfileLoading || (!!user && isPreferencesLoading);

  // Dialog states
  const [roomManagementOpen, setRoomManagementOpen] = useState(false);
  const [relayManagementOpen, setRelayManagementOpen] = useState(false);
  const [relayManagementDefaultTab, setRelayManagementDefaultTab] = useState<'relays' | 'media'>('relays');
  const [vehicleTypeManagementOpen, setVehicleTypeManagementOpen] = useState(false);
  const [encryptionSettingsOpen, setEncryptionSettingsOpen] = useState(false);
  const [addTabDialogOpen, setAddTabDialogOpen] = useState(false);
  
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

  const renderTabContent = () => {
    switch (preferences.activeTab) {
      case 'home':
        return (
          <HomeTab 
            onNavigateToTab={handleNavigateToTab} 
            onAddTab={() => setAddTabDialogOpen(true)} 
          />
        );
      case 'appliances':
        return <AppliancesTab scrollTarget={scrollTarget} />;
      case 'maintenance':
        return <MaintenanceTab scrollTarget={scrollTarget} />;
      case 'vehicles':
        return <VehiclesTab scrollTarget={scrollTarget} />;
      case 'subscriptions':
        return <SubscriptionsTab />;
      case 'warranties':
        return <WarrantiesTab />;
      case 'contractors':
        return <ContractorsTab />;
      case 'projects':
        return <ProjectsTab />;
      default:
        return (
          <HomeTab 
            onNavigateToTab={handleNavigateToTab} 
            onAddTab={() => setAddTabDialogOpen(true)} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-sky-100 dark:from-slate-900 dark:to-slate-800 tool-pattern-bg">
      {/* Header + Tab Navigation - Combined sticky container */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-sky-200 dark:border-slate-700">
        <header>
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            {/* Left - Menu & Logo */}
            <div className="flex items-center gap-3">
              {user && !isDataLoading && (
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
                      Manage Rooms
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVehicleTypeManagementOpen(true)}>
                      <Car className="h-4 w-4 mr-2" />
                      Manage Vehicle Types
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Privacy & Security</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEncryptionSettingsOpen(true)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Data Encryption
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Server Settings</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openRelayManagement('relays')}>
                      <Wifi className="h-4 w-4 mr-2" />
                      Manage Relays
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openRelayManagement('media')}>
                      <Cloud className="h-4 w-4 mr-2" />
                      Media Servers
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
                <Home className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                <span className="font-bold text-xl text-sky-700 dark:text-sky-300">Home Log</span>
              </div>
            </div>

            {/* Right - Theme Toggle & Login */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LoginArea className="max-w-48" />
            </div>
          </div>
        </header>

        {/* Tab Navigation - Only shown when logged in and all data is loaded */}
        {user && !isDataLoading && (
          <TabNavigation onAddTabClick={() => setAddTabDialogOpen(true)} />
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isDataLoading ? (
          // Loading profile and preferences from relay
          <LoadingAnimation 
            size="md"
            message={isProfileLoading ? "Loading your profile..." : "Loading your preferences..."}
            subMessage="Fetching your data from the relay"
          />
        ) : !user ? (
          // Not logged in - Welcome screen
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-sky-200 dark:bg-sky-800 mb-6">
                <Home className="h-12 w-12 text-sky-600 dark:text-sky-300" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Welcome to Home Log
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                Keep track of home appliances, vehicle maintenance, general home maintenance, contractors/service providers, subscriptions, warranties, and future home projects. Caring for your home has never been easier or more organized!
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <Package className="h-10 w-10 text-sky-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Track Everything</h3>
                  <p className="text-sm text-muted-foreground">
                    Appliances, vehicles, warranties, and contractors all in one place.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <Wrench className="h-10 w-10 text-sky-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Never Miss a Task</h3>
                  <p className="text-sm text-muted-foreground">
                    Schedule maintenance for your home, vehicles, and subscriptions.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <Calendar className="h-10 w-10 text-sky-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Plan Ahead</h3>
                  <p className="text-sm text-muted-foreground">
                    Organize future projects and keep your home running smoothly.
                  </p>
                </CardContent>
              </Card>
            </div>

            <LoginArea className="justify-center" />

            <div className="mt-8 text-sm text-slate-500 dark:text-slate-400 space-y-2">
              <p className="flex items-center justify-center gap-3">
                <Link to="/faq" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  FAQ
                </Link>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <Link to="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Privacy Policy
                </Link>
              </p>
              <p>
                <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Vibed with Shakespeare
                </a>
              </p>
            </div>
          </div>
        ) : (
          // Logged in - Tab-based dashboard
          <div className="space-y-8">
            {/* Tab Content */}
            {renderTabContent()}

            {/* Donate Section */}
            <section>
              <DonateSection />
            </section>

            {/* Footer */}
            <footer className="text-center py-8 text-sm text-slate-500 dark:text-slate-400 space-y-2">
              <p className="flex items-center justify-center gap-3">
                <Link to="/faq" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  FAQ
                </Link>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <Link to="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Privacy Policy
                </Link>
              </p>
              <p>
                <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
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

      <EncryptionSettingsDialog
        isOpen={encryptionSettingsOpen}
        onClose={() => setEncryptionSettingsOpen(false)}
      />
    </div>
  );
};

export default Index;
