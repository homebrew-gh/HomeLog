import { useState } from 'react';
import { 
  Dialog, 
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Wrench, 
  Car, 
  CreditCard, 
  Shield, 
  Building2, 
  Hammer,
  PawPrint,
  Home,
  Lock,
  Search,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tips?: string[];
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Cypher Log',
    description: 'Your all-in-one home ownership management system. Track appliances, vehicles, maintenance schedules, warranties, and more — all secured with Nostr.',
    icon: <Home className="h-12 w-12" />,
    color: 'from-primary/20 to-primary/5',
    tips: [
      'Your data syncs across devices via Nostr relays',
      'End-to-end encryption keeps your information private',
      'No account required — just log in with your Nostr key',
    ],
  },
  {
    id: 'appliances',
    title: 'Track Your Appliances',
    description: 'Keep a detailed inventory of all your home appliances. Record purchase dates, model numbers, serial numbers, and warranty information.',
    icon: <Package className="h-12 w-12" />,
    color: 'from-blue-500/20 to-blue-500/5',
    tips: [
      'Organize appliances by room',
      'Store manuals and receipts',
      'Track purchase prices and dates',
    ],
  },
  {
    id: 'maintenance',
    title: 'Never Miss Maintenance',
    description: 'Schedule and track maintenance tasks for your home, appliances, and outdoor areas. Get organized with recurring reminders.',
    icon: <Wrench className="h-12 w-12" />,
    color: 'from-amber-500/20 to-amber-500/5',
    tips: [
      'Set up recurring maintenance schedules',
      'Track completed tasks with history',
      'Organize by home features (HVAC, plumbing, etc.)',
    ],
  },
  {
    id: 'vehicles',
    title: 'Manage Your Vehicles',
    description: 'Track all your vehicles including cars, trucks, motorcycles, boats, and more. Log maintenance, fuel economy, and service history.',
    icon: <Car className="h-12 w-12" />,
    color: 'from-green-500/20 to-green-500/5',
    tips: [
      'Track mileage and fuel consumption',
      'Schedule oil changes and inspections',
      'Store insurance and registration info',
    ],
  },
  {
    id: 'subscriptions',
    title: 'Control Your Subscriptions',
    description: 'Keep track of all your recurring subscriptions and memberships. Never be surprised by a forgotten renewal again.',
    icon: <CreditCard className="h-12 w-12" />,
    color: 'from-purple-500/20 to-purple-500/5',
    tips: [
      'Track monthly and annual costs',
      'Set renewal reminders',
      'Calculate total subscription spending',
    ],
  },
  {
    id: 'warranties',
    title: 'Protect Your Investments',
    description: 'Store warranty information for all your purchases. Know exactly when warranties expire and what\'s covered.',
    icon: <Shield className="h-12 w-12" />,
    color: 'from-red-500/20 to-red-500/5',
    tips: [
      'Track expiration dates',
      'Store warranty documents',
      'Link warranties to appliances',
    ],
  },
  {
    id: 'companies',
    title: 'Your Service Providers',
    description: 'Maintain a directory of contractors, service providers, and companies you work with. Keep contact info and notes handy.',
    icon: <Building2 className="h-12 w-12" />,
    color: 'from-cyan-500/20 to-cyan-500/5',
    tips: [
      'Store contact information',
      'Add notes about past work',
      'Quick access when you need repairs',
    ],
  },
  {
    id: 'projects',
    title: 'Plan Future Projects',
    description: 'Dream big and plan ahead. Track home improvement ideas, renovations, and projects you want to tackle.',
    icon: <Hammer className="h-12 w-12" />,
    color: 'from-orange-500/20 to-orange-500/5',
    tips: [
      'Estimate costs and timelines',
      'Prioritize your project list',
      'Track progress on ongoing work',
    ],
  },
  {
    id: 'pets',
    title: 'Care for Your Pets',
    description: 'Track your furry (or scaly) family members. Record vet visits, medications, vaccinations, and important health information.',
    icon: <PawPrint className="h-12 w-12" />,
    color: 'from-pink-500/20 to-pink-500/5',
    tips: [
      'Track vet appointments',
      'Store vaccination records',
      'Monitor medications and health',
    ],
  },
  {
    id: 'security',
    title: 'Your Data, Your Control',
    description: 'Cypher Log uses Nostr for decentralized data storage with optional end-to-end encryption. Your data stays private and portable.',
    icon: <Lock className="h-12 w-12" />,
    color: 'from-slate-500/20 to-slate-500/5',
    tips: [
      'Enable encryption for sensitive data',
      'Data syncs across all your devices',
      'Export your data anytime',
    ],
  },
  {
    id: 'search',
    title: 'Find Anything Instantly',
    description: 'Powerful global search helps you find any item, company, or record in seconds. Press Cmd/Ctrl+K or use the search button.',
    icon: <Search className="h-12 w-12" />,
    color: 'from-indigo-500/20 to-indigo-500/5',
    tips: [
      'Search across all categories',
      'Quick keyboard shortcut access',
      'Filter by type or status',
    ],
  },
  {
    id: 'getstarted',
    title: 'Ready to Get Started?',
    description: 'Log in with your Nostr key to begin organizing your home. Your journey to stress-free home management starts now!',
    icon: <Sparkles className="h-12 w-12" />,
    color: 'from-primary/20 to-primary/5',
    tips: [
      'Start by adding your appliances',
      'Set up rooms to organize items',
      'Customize tabs to fit your needs',
    ],
  },
];

interface FeatureTourDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureTourDialog({ isOpen, onClose }: FeatureTourDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  
  const goNext = () => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const goPrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const goToStep = (index: number) => {
    setCurrentStep(index);
  };
  
  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with Icon */}
        <div className={cn(
          "relative px-6 pt-8 pb-6 bg-gradient-to-br",
          step.color
        )}>
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
          </div>
          
          <div className="relative flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-background/80 backdrop-blur-sm shadow-lg mb-4">
              <div className="text-primary">
                {step.icon}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {step.title}
            </h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-muted-foreground text-center mb-6">
            {step.description}
          </p>
          
          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="space-y-2 mb-6">
              {step.tips.map((tip, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentStep 
                    ? "bg-primary w-6" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={isFirstStep}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            {isLastStep ? (
              <Button
                onClick={handleClose}
                className="flex-1"
              >
                Get Started
                <Sparkles className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={goNext}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
          
          {/* Skip link */}
          <div className="text-center mt-4">
            <button
              onClick={handleClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
