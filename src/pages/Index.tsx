import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Home, Package, Wrench, Calendar, Menu, Settings, Wifi, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import { RelayManagementDialog } from '@/components/RelayManagementDialog';
import { DonateSection } from '@/components/DonateSection';
import { TabNavigation } from '@/components/TabNavigation';
import { AddTabDialog } from '@/components/AddTabDialog';
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
  const { preferences, setActiveTab } = useTabPreferences();

  // Dialog states
  const [roomManagementOpen, setRoomManagementOpen] = useState(false);
  const [relayManagementOpen, setRelayManagementOpen] = useState(false);
  const [addTabDialogOpen, setAddTabDialogOpen] = useState(false);

  const handleNavigateToTab = (tabId: TabId) => {
    setActiveTab(tabId);
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
        return <AppliancesTab />;
      case 'maintenance':
        return <MaintenanceTab />;
      case 'vehicles':
        return <VehiclesTab />;
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
              {user && !isProfileLoading && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setRoomManagementOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Rooms
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRelayManagementOpen(true)}>
                      <Wifi className="h-4 w-4 mr-2" />
                      Manage Relays
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

        {/* Tab Navigation - Only shown when logged in and profile is loaded */}
        {user && !isProfileLoading && (
          <TabNavigation onAddTabClick={() => setAddTabDialogOpen(true)} />
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isProfileLoading ? (
          // Loading profile from relay
          <div className="flex flex-col items-center justify-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sky-100 dark:bg-sky-900 mb-6">
              <Loader2 className="h-10 w-10 text-sky-600 dark:text-sky-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Loading your profile...
            </h2>
            <p className="text-muted-foreground">
              Fetching your data from the relay
            </p>
          </div>
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

            <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
              <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Vibed with Shakespeare
              </a>
            </p>
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
            <footer className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
              <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Vibed with Shakespeare
              </a>
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
      />

      <AddTabDialog
        isOpen={addTabDialogOpen}
        onClose={() => setAddTabDialogOpen(false)}
      />
    </div>
  );
};

export default Index;
