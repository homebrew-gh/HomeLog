import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Home, ArrowLeft, Shield, Lock, Server, Key, Eye, Database, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Privacy() {
  useSeoMeta({
    title: 'Privacy Policy - Home Log',
    description: 'Privacy policy for Home Log - a decentralized home management application built on Nostr.',
  });

  const lastUpdated = 'January 23, 2026';

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
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-200 dark:bg-sky-800 mb-4">
            <Shield className="h-8 w-8 text-sky-600 dark:text-sky-300" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 mb-6">
          <CardContent className="pt-6">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Home Log is a decentralized application built on the Nostr protocol. This privacy policy explains how your data is handled, stored, and protected when you use Home Log.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">Key Point:</strong> Home Log does not operate servers that store your data. Your data is stored on Nostr relays that you choose and control.
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {/* How Home Log Works */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-sky-600" />
                How Home Log Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Home Log is a client-side web application that runs entirely in your browser. It uses the Nostr protocol to store and retrieve your data from decentralized relay servers.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Home Log does not have its own backend servers or databases</li>
                <li>All application logic runs locally in your web browser</li>
                <li>Your data is published to and retrieved from Nostr relays</li>
                <li>You control which relays store your data</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data We Collect */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-sky-600" />
                Data You Create
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                When you use Home Log, you may create the following types of data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Appliance information:</strong> Model, manufacturer, purchase date, room location, receipts, and manuals</li>
                <li><strong>Vehicle information:</strong> Make, model, year, VIN, license plates, insurance details, registration, and maintenance records</li>
                <li><strong>Maintenance schedules:</strong> Task descriptions, frequencies, part numbers, and completion history</li>
                <li><strong>User preferences:</strong> Tab configuration, view modes, custom room names, and custom vehicle types</li>
                <li><strong>Relay configuration:</strong> Your preferred Nostr relay list</li>
              </ul>
            </CardContent>
          </Card>

          {/* Encryption */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-sky-600" />
                Encryption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Home Log uses NIP-44 encryption to protect your sensitive data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Encrypted by default:</strong> Appliances, vehicles, maintenance schedules, and completion records are encrypted before being sent to relays</li>
                <li><strong>End-to-end encryption:</strong> Data is encrypted using your Nostr private key. Only you can decrypt it</li>
                <li><strong>Relay operators cannot read your encrypted data:</strong> Even though your data is stored on relays, the content is encrypted and unreadable without your private key</li>
                <li><strong>Configurable:</strong> You can choose which data categories to encrypt in the Data Encryption settings</li>
              </ul>
              <p>
                Some data is not encrypted by design:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Relay list (NIP-65):</strong> Your relay preferences are public so other Nostr clients can find you</li>
                <li><strong>App preferences (NIP-78):</strong> Tab configuration and view preferences are stored unencrypted</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Storage */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5 text-sky-600" />
                Data Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Your data is stored in two locations:
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">1. Nostr Relays</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Your data is published to the Nostr relays you have configured</li>
                <li>You can add, remove, or change relays at any time</li>
                <li>Default relays are provided, but you can use your own private relays for additional privacy</li>
                <li>Relay operators may have their own data retention policies</li>
                <li>Home Log has no control over relay operators or their policies</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">2. Local Browser Storage</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Some settings are cached locally in your browser for performance</li>
                <li>This includes relay configuration, encryption preferences, and UI preferences</li>
                <li>Local storage can be cleared by clearing your browser data</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Keys */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-sky-600" />
                Your Nostr Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Home Log uses your Nostr identity for authentication and data ownership:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Home Log never has access to your private key:</strong> Authentication is handled by your Nostr signer (browser extension, Amber, etc.)</li>
                <li><strong>Your public key identifies your data:</strong> All events you create are signed with your Nostr identity</li>
                <li><strong>You own your data:</strong> Because you control your private key, you control your data</li>
                <li><strong>Portable identity:</strong> You can use the same Nostr identity across any Nostr application</li>
              </ul>
            </CardContent>
          </Card>

          {/* Third Parties */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5 text-sky-600" />
                Third Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Home Log interacts with the following third parties:
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">Nostr Relays</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Relays receive and store your Nostr events</li>
                <li>Relay operators may log connection information (IP addresses, timestamps)</li>
                <li>Each relay has its own privacy practices</li>
                <li>Using private or self-hosted relays gives you more control</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Blossom Servers (File Uploads)</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>If you upload files (receipts, manuals, documents), they are stored on Blossom-compatible servers</li>
                <li>Uploaded files are content-addressed and publicly accessible via their URLs</li>
                <li>Do not upload files containing sensitive information you wish to keep private</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">No Analytics or Tracking</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Home Log does not include analytics, tracking pixels, or advertising</li>
                <li>Home Log does not collect usage statistics</li>
                <li>Home Log does not share data with advertisers or data brokers</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Deletion */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-sky-600" />
                Data Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                When you delete items in Home Log:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>A deletion request (NIP-09) is published to your relays</li>
                <li>Well-behaved relays will honor deletion requests and remove the data</li>
                <li>However, deletion cannot be guaranteed across all relays</li>
                <li>Some relays may retain data or not support deletion requests</li>
                <li>Previously distributed data may exist in backups or caches</li>
              </ul>
              <p>
                To clear local data, clear your browser's local storage and cookies for this site.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-sky-600" />
                Your Rights and Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Because Home Log is built on Nostr, you have significant control over your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Data portability:</strong> Your data is stored in an open format and can be accessed by any Nostr client</li>
                <li><strong>Relay choice:</strong> You choose which relays store your data</li>
                <li><strong>Encryption control:</strong> You choose what data to encrypt</li>
                <li><strong>Identity ownership:</strong> You own your Nostr keys and can use them anywhere</li>
                <li><strong>No account required:</strong> Home Log doesn't require creating an account with us - you just use your Nostr identity</li>
              </ul>
            </CardContent>
          </Card>

          {/* Changes */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                We may update this privacy policy from time to time. Changes will be reflected on this page with an updated revision date. Continued use of Home Log after changes constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Home Log is an open-source project. If you have questions about this privacy policy or how Home Log handles data, you can:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Review the source code on GitHub</li>
                <li>Open an issue on the project repository</li>
                <li>Reach out via Nostr to the project maintainers</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/faq" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              FAQ
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link to="/license" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              MIT License
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link to="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Back to Home Log
            </Link>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Vibed with Shakespeare
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Privacy;
