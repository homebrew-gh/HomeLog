import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { 
  Home, 
  ArrowLeft, 
  Package, 
  Car, 
  Wrench, 
  CheckCircle2, 
  Wifi, 
  Settings, 
  Shield,
  Lock,
  HelpCircle,
  ExternalLink,
  Database,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

// Event kind information
const EVENT_KINDS = [
  {
    kind: 32627,
    name: 'Home Appliance',
    category: 'Custom (Addressable)',
    icon: Package,
    color: 'sky',
    description: 'Stores information about home appliances including model, manufacturer, purchase date, room location, and links to receipts or manuals.',
    dataStored: [
      'Model name/number',
      'Manufacturer',
      'Purchase date',
      'Room location',
      'Receipt URL',
      'Manual URL',
    ],
    encrypted: true,
  },
  {
    kind: 32628,
    name: 'Vehicle',
    category: 'Custom (Addressable)',
    icon: Car,
    color: 'sky',
    description: 'Stores comprehensive vehicle information including cars, trucks, boats, planes, and farm machinery with their identification numbers, registration, and insurance details.',
    dataStored: [
      'Vehicle name and type',
      'Make, model, year',
      'VIN / Hull ID / Tail number',
      'License plate / Registration',
      'Mileage / Engine hours',
      'Insurance information',
      'Warranty details',
      'Purchase information',
    ],
    encrypted: true,
  },
  {
    kind: 37003,
    name: 'Contractor/Service Provider',
    category: 'Custom (Addressable)',
    icon: Users,
    color: 'sky',
    description: 'Stores information about contractors and service providers including contact details, business credentials, ratings, and date-stamped invoices.',
    dataStored: [
      'Business/contractor name',
      'Service type (plumber, electrician, etc.)',
      'Contact info (phone, email, website)',
      'Address',
      'License and insurance info',
      'Rating (1-5 stars)',
      'Invoices with date, amount, description',
      'Notes',
    ],
    encrypted: false,
  },
  {
    kind: 30229,
    name: 'Maintenance Schedule',
    category: 'Custom (Addressable)',
    icon: Wrench,
    color: 'amber',
    description: 'Defines recurring maintenance tasks for appliances or vehicles, including frequency intervals and optional part numbers.',
    dataStored: [
      'Task description',
      'Frequency (days/weeks/months/years)',
      'Mileage interval (for vehicles)',
      'Part numbers',
      'Reference to appliance or vehicle',
    ],
    encrypted: true,
  },
  {
    kind: 9413,
    name: 'Maintenance Completion',
    category: 'Custom (Regular)',
    icon: CheckCircle2,
    color: 'green',
    description: 'Records when a maintenance task was completed, creating a history of all maintenance performed on your appliances and vehicles.',
    dataStored: [
      'Completion date',
      'Mileage at completion (optional)',
      'Notes',
      'Reference to maintenance schedule',
    ],
    encrypted: true,
  },
  {
    kind: 10002,
    name: 'Relay List (NIP-65)',
    category: 'Standard (Replaceable)',
    icon: Wifi,
    color: 'purple',
    description: 'Publishes your preferred relay list so other Nostr clients can find where to reach you. This is a standard Nostr event used across the ecosystem.',
    dataStored: [
      'List of relay URLs',
      'Read/write permissions for each relay',
    ],
    encrypted: false,
  },
  {
    kind: 30078,
    name: 'App Preferences (NIP-78)',
    category: 'Standard (Addressable)',
    icon: Settings,
    color: 'slate',
    description: 'Stores your Home Log preferences including active tabs, view modes, custom rooms, vehicle types, and contractor service types. Synced across devices.',
    dataStored: [
      'Active tabs configuration',
      'View mode preferences',
      'Custom room names',
      'Custom vehicle types',
      'Custom contractor service types',
      'Blossom media server configuration',
    ],
    encrypted: false,
  },
  {
    kind: 5,
    name: 'Deletion Request (NIP-09)',
    category: 'Standard (Regular)',
    icon: Database,
    color: 'red',
    description: 'Published when you delete an appliance, vehicle, or other item. Requests that relays remove the referenced events.',
    dataStored: [
      'Reference to deleted event(s)',
      'Deletion reason (optional)',
    ],
    encrypted: false,
  },
];

const FAQ_ITEMS = [
  {
    question: 'What is Nostr?',
    answer: 'Nostr (Notes and Other Stuff Transmitted by Relays) is a decentralized protocol for social networking and data storage. Instead of storing your data on a single company\'s server, your data is stored on multiple relays that you choose. You control your identity with cryptographic keys, and your data is portable across any Nostr-compatible application.',
  },
  {
    question: 'Is my data encrypted?',
    answer: 'Yes! Home Log uses NIP-44 encryption for sensitive data like appliances, vehicles, and maintenance records. This means your data is encrypted with your private key before being sent to relays. Only you can decrypt and read your data, even though it\'s stored on public relays. You can verify this in Settings > Data Encryption using the "Trust but Verify" feature.',
  },
  {
    question: 'What are relays?',
    answer: 'Relays are servers that store and distribute Nostr events (data). You can connect to multiple relays for redundancy. Public relays are open to everyone, while private relays restrict access. For maximum privacy, consider using a private relay for your Home Log data.',
  },
  {
    question: 'Can I use Home Log on multiple devices?',
    answer: 'Yes! Because your data is stored on Nostr relays (not locally), you can access your Home Log from any device. Just log in with the same Nostr identity (via browser extension, Amber on Android, or other signing methods).',
  },
  {
    question: 'What happens if a relay goes offline?',
    answer: 'If you\'re connected to multiple relays, your data will still be available from the other relays. This is why it\'s recommended to use at least 2-3 relays. Home Log shows connection status indicators (green/red) in the relay management settings.',
  },
  {
    question: 'Can other Nostr apps read my Home Log data?',
    answer: 'The custom event kinds (32627, 32628, 37003, 30229, 9413) are specific to Home Log and documented in our NIP specification. Other apps could theoretically read this data if they implement support for these kinds, but encrypted data can only be decrypted by you. Standard kinds like relay lists (10002) are interoperable with other Nostr clients.',
  },
  {
    question: 'How do I back up my data?',
    answer: 'Your data is automatically backed up to all your connected relays. For additional safety, you can add more relays in Settings > Manage Relays. Your private key (managed by your signer/extension) is the master key to your data - keep it safe and backed up!',
  },
];

export function FAQ() {
  useSeoMeta({
    title: 'FAQ - Home Log',
    description: 'Frequently asked questions about Home Log and the Nostr event kinds it uses.',
  });

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'sky':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'amber':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'green':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'purple':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'red':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getIconColorClass = (color: string) => {
    switch (color) {
      case 'sky': return 'text-sky-600 dark:text-sky-400';
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      case 'green': return 'text-green-600 dark:text-green-400';
      case 'purple': return 'text-purple-600 dark:text-purple-400';
      case 'red': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-sky-100 dark:from-slate-900 dark:to-slate-800 tool-pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-sky-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              <span className="font-bold text-xl text-sky-700 dark:text-sky-300">Home Log</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-200 dark:bg-sky-800 mb-4">
            <HelpCircle className="h-8 w-8 text-sky-600 dark:text-sky-300" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Learn about how Home Log works and what data it stores
          </p>
        </div>

        {/* Event Kinds Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Database className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Data Types (Event Kinds)
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Home Log stores your data as Nostr events. Each type of data has a unique "kind" number. Here's what each kind stores:
          </p>

          <div className="grid gap-4">
            {EVENT_KINDS.map((eventKind) => {
              const Icon = eventKind.icon;
              return (
                <Card key={eventKind.kind} className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getColorClasses(eventKind.color)}`}>
                          <Icon className={`h-5 w-5 ${getIconColorClass(eventKind.color)}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {eventKind.name}
                            <Badge variant="outline" className="font-mono text-xs">
                              kind: {eventKind.kind}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {eventKind.category}
                          </CardDescription>
                        </div>
                      </div>
                      {eventKind.encrypted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">
                          <Lock className="h-3 w-3 mr-1" />
                          Encrypted
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {eventKind.description}
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Data stored:
                      </p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {eventKind.dataStored.map((item, index) => (
                          <li key={index} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <Separator className="my-8" />

        {/* FAQ Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Common Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <Card key={index} className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800 dark:text-slate-100">
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Learn More Section */}
        <section className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Learn More About Nostr
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <a 
              href="https://nostr.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-900">
                <ExternalLink className="h-4 w-4 mr-2" />
                nostr.com
              </Button>
            </a>
            <a 
              href="https://github.com/nostr-protocol/nips" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-900">
                <ExternalLink className="h-4 w-4 mr-2" />
                NIPs Repository
              </Button>
            </a>
          </div>

          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              ← Back to Home Log
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default FAQ;
