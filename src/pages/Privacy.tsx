import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Home, ArrowLeft, Shield, Lock, Server, Key, Eye, Database, Globe, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Privacy() {
  useSeoMeta({
    title: 'Privacy Policy - Cypher Log',
    description: 'Privacy policy for Cypher Log - a decentralized home management application built on Nostr.',
  });

  const lastUpdated = 'January 30, 2026';

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
              <span className="font-bold text-xl text-sky-700 dark:text-sky-300">Cypher Log</span>
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

        {/* Critical Warning */}
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              Important Disclaimer - Read Before Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-red-900 dark:text-red-100">
            <p className="font-semibold">
              Cypher Log is a home management tool intended for organizational purposes only. 
              YOU USE THIS APPLICATION ENTIRELY AT YOUR OWN RISK.
            </p>
            <p>
              <strong>Do NOT enter highly sensitive personal information</strong> into Cypher Log, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Social Security Numbers or government-issued ID numbers</li>
              <li>Bank account numbers, credit card numbers, or financial credentials</li>
              <li>Passwords, PINs, or security codes</li>
              <li>Complete health records or detailed medical information</li>
              <li>Insurance policy numbers or claim details</li>
              <li>Precise GPS coordinates or exact home addresses</li>
              <li>Vehicle Identification Numbers (VINs) without understanding the risks</li>
              <li>Any other information that could enable identity theft or fraud</li>
            </ul>
            <p>
              While Cypher Log offers encryption features, <strong>no system is completely secure</strong>. 
              Encryption can fail, keys can be compromised, and relays may not honor deletion requests. 
              The developers of Cypher Log accept <strong>no liability</strong> for any data breaches, 
              unauthorized access, or misuse of information you choose to store.
            </p>
            <p className="font-semibold">
              By using Cypher Log, you acknowledge that you are solely responsible for the data you enter 
              and any consequences that may result from that decision.
            </p>
          </CardContent>
        </Card>

        {/* Introduction */}
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 mb-6">
          <CardContent className="pt-6">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Cypher Log is a decentralized application built on the Nostr protocol. This privacy policy explains how your data is handled, stored, and protected when you use Cypher Log.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">Key Point:</strong> Cypher Log does not operate servers that store your data. Your data is stored on Nostr relays that you choose and control.
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {/* How Cypher Log Works */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-sky-600" />
                How Cypher Log Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Cypher Log is a client-side web application that runs entirely in your browser. It uses the Nostr protocol to store and retrieve your data from decentralized relay servers.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Cypher Log does not have its own backend servers or databases</li>
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
                When you use Cypher Log, you may create the following types of data. 
                <strong className="text-amber-700 dark:text-amber-400"> You are solely responsible for what information you choose to enter.</strong>
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">Home Items ("My Stuff")</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Model, manufacturer, purchase date, price, room location</li>
                <li>Receipt images and product manuals (uploaded files)</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Vehicles</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Make, model, year, name, fuel type</li>
                <li>License plates, VIN, registration numbers, hull IDs, tail numbers</li>
                <li>Mileage/engine hours, registration expiry dates</li>
                <li>Purchase information and documents</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Maintenance</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Task descriptions, schedules, frequencies</li>
                <li>Part numbers, costs, completion records</li>
                <li>Mileage/hours at completion</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Subscriptions</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Service names, costs, billing frequencies</li>
                <li>Linked assets and service providers</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Warranties</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Product names, purchase information</li>
                <li>Warranty dates, registration numbers</li>
                <li>Extended warranty details</li>
                <li>Warranty documents (uploaded files)</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Companies/Service Providers</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Business names, contact information (phone, email, website)</li>
                <li>Addresses, license numbers, insurance information</li>
                <li>Invoices and payment history (uploaded files)</li>
                <li>Ratings and notes</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Projects</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Project names, descriptions, timelines</li>
                <li>Budgets and expense tracking</li>
                <li>Tasks, materials, and diary entries</li>
                <li>Progress photos (uploaded files)</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Pets & Animals</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Pet names, species, breeds, birth/adoption dates</li>
                <li>Microchip IDs, license numbers</li>
                <li>Veterinary clinic information</li>
                <li>Medical information (allergies, medications, conditions)</li>
                <li>Vet visit records (dates, diagnoses, treatments, costs)</li>
                <li>Photos and documents (uploaded files)</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">User Preferences</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Tab configuration, display settings, theme preferences</li>
                <li>Custom room names, vehicle types, subscription types</li>
                <li>Encryption settings per data category</li>
                <li>Relay configuration and preferences</li>
                <li>Currency preferences</li>
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
                Cypher Log offers NIP-44 encryption to protect your data. However, <strong>encryption is not a guarantee of security</strong>.
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">Categories Encrypted by Default:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Home items ("My Stuff")</li>
                <li>Vehicles</li>
                <li>Maintenance schedules and completions</li>
                <li>Subscriptions</li>
                <li>Warranties</li>
                <li>Pets and vet visits</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Categories NOT Encrypted by Default:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Companies/Service Providers (for potential future sharing features)</li>
                <li>Projects (for potential future sharing features)</li>
              </ul>
              <p>
                You can configure encryption settings per category in the app's Privacy & Security settings.
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">Encryption Limitations:</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-3">
                <li><strong>Requires compatible signer:</strong> Encryption requires a Nostr signer that supports NIP-44. If your signer doesn't support NIP-44, encryption will fail.</li>
                <li><strong>Encryption can fail:</strong> If encryption fails for any reason, Cypher Log will NOT store your data in plaintext without your knowledge. The operation will fail and you will be notified.</li>
                <li><strong>Key compromise:</strong> If your Nostr private key is compromised, all encrypted data can be decrypted by whoever has your key.</li>
                <li><strong>Metadata visible:</strong> Even with encrypted content, event metadata (timestamps, event kind, public key) is visible to relay operators.</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Data NOT Encrypted (by design):</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Relay list (NIP-65):</strong> Public so other Nostr clients can discover you</li>
                <li><strong>App preferences:</strong> Tab configuration, display settings, custom type lists</li>
                <li><strong>Profile data:</strong> If you create a profile, it follows standard Nostr conventions</li>
                <li><strong>Uploaded files:</strong> Files uploaded to Blossom servers are NOT encrypted and are publicly accessible via their URLs</li>
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
                <li>Cypher Log has no control over relay operators or their policies</li>
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
                Your Nostr Identity ("House Key")
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Cypher Log uses your Nostr identity for authentication and data ownership:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Cypher Log never has access to your private key:</strong> Authentication is handled by your Nostr signer (browser extension, Amber, etc.) or generated locally in your browser</li>
                <li><strong>Your public key identifies your data:</strong> All events you create are signed with your Nostr identity</li>
                <li><strong>You own your data:</strong> Because you control your private key, you control your data</li>
                <li><strong>Portable identity:</strong> You can use the same Nostr identity across any Nostr application</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-4">House Key Recommendation</p>
              <p>
                We recommend creating a dedicated "House Key" (a separate Nostr identity) specifically for Cypher Log, rather than using your social Nostr identity. Benefits include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Security isolation:</strong> If your social profile key is compromised, your home data remains protected</li>
                <li><strong>Household sharing:</strong> You can share a House Key with family members without connecting social identities</li>
                <li><strong>Privacy separation:</strong> Your home management data stays separate from your social presence on Nostr</li>
              </ul>
              <p className="mt-4">
                <strong>Important:</strong> If you lose your private key (House Key or otherwise), you will permanently lose access to all data associated with that key. Cypher Log cannot recover lost keys. Always back up your keys securely.
              </p>
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
                Cypher Log interacts with the following third parties. We have no control over their privacy practices or data handling.
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">Nostr Relays</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Relays receive and store your Nostr events</li>
                <li>Relay operators may log connection information (IP addresses, timestamps)</li>
                <li>Each relay has its own privacy practices and terms of service</li>
                <li>Relays may retain data even after deletion requests</li>
                <li>Using private or self-hosted relays gives you more control</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Blossom/Media Servers (File Uploads)</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Uploaded files (receipts, manuals, photos, documents) are stored on media servers you configure</li>
                <li><strong className="text-red-600 dark:text-red-400">Uploaded files are NOT encrypted</strong> and may be publicly accessible via their URLs</li>
                <li>Do not upload files containing sensitive information (bank statements, medical records, identification documents)</li>
                <li>Media server operators can see and access all files you upload</li>
                <li>Deletion of uploaded files depends on the media server's policies</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Currency Exchange Rate APIs</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Cypher Log fetches currency exchange rates from third-party APIs for display purposes</li>
                <li>These requests may be logged by the API providers</li>
                <li>No personal data is transmitted with these requests</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">BTCMap API (Optional)</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>If you use the Bitcoin acceptance lookup feature for companies, requests are made to BTCMap</li>
                <li>Only business location queries are transmitted, not your personal data</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">Nostr Wallet Connect (Optional)</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>If you connect a Lightning wallet via NWC, connection strings are stored locally in your browser</li>
                <li>Payment requests are sent directly to your configured wallet service</li>
                <li>Cypher Log does not have access to your wallet funds</li>
              </ul>
              <p className="font-medium text-slate-800 dark:text-slate-200">No Analytics or Tracking</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Cypher Log does not include analytics, tracking pixels, or advertising</li>
                <li>Cypher Log does not collect usage statistics</li>
                <li>Cypher Log does not share data with advertisers or data brokers</li>
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
                When you delete items in Cypher Log:
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
                Because Cypher Log is built on Nostr, you have significant control over your data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Data portability:</strong> Your data is stored in an open format and can be accessed by any Nostr client</li>
                <li><strong>Relay choice:</strong> You choose which relays store your data</li>
                <li><strong>Encryption control:</strong> You choose what data to encrypt</li>
                <li><strong>Identity ownership:</strong> You own your Nostr keys and can use them anywhere</li>
                <li><strong>No account required:</strong> Cypher Log doesn't require creating an account with us - you just use your Nostr identity</li>
              </ul>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-amber-900 dark:text-amber-100">
              <p>
                Cypher Log is provided "AS IS" without warranty of any kind, express or implied. The developers and contributors of Cypher Log:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Make no guarantees about the security, reliability, or availability of the application</li>
                <li>Are not responsible for any data loss, data breaches, or unauthorized access to your data</li>
                <li>Are not liable for any damages arising from your use of the application</li>
                <li>Do not guarantee that encryption will protect your data in all circumstances</li>
                <li>Have no control over Nostr relays, media servers, or other third-party services</li>
                <li>Cannot recover lost data or private keys</li>
              </ul>
              <p className="font-semibold">
                You are solely responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Backing up your Nostr private keys (House Keys)</li>
                <li>Choosing what data to enter into the application</li>
                <li>Understanding the risks of storing personal information</li>
                <li>Complying with applicable laws and regulations</li>
                <li>Securing your devices and browser</li>
              </ul>
              <p>
                If you do not agree with these terms, do not use Cypher Log.
              </p>
            </CardContent>
          </Card>

          {/* Changes */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                We may update this privacy policy from time to time. Changes will be reflected on this page with an updated revision date. Continued use of Cypher Log after changes constitutes acceptance of the updated policy.
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
                Cypher Log is an open-source project. If you have questions about this privacy policy or how Cypher Log handles data, you can:
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
              Back to Cypher Log
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
