import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Home, ArrowLeft, FileText, Shield, AlertTriangle, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Terms() {
  useSeoMeta({
    title: 'Terms of Use - Cypher Log',
    description: 'Terms of use for Cypher Log - a decentralized home management application built on the Nostr protocol.',
  });

  const lastUpdated = 'February 4, 2026';

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
            <FileText className="h-8 w-8 text-sky-600 dark:text-sky-300" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Terms of Use
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Acceptance / Important notice */}
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              By Using Cypher Log You Agree to These Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
            <p>
              By accessing or using Cypher Log, you agree to be bound by these Terms of Use. If you do not agree, do not use the application. We recommend also reading our{' '}
              <Link to="/privacy" className="underline hover:text-sky-600 dark:hover:text-sky-400">
                Privacy Policy
              </Link>.
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {/* Description of service */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-sky-600" />
                What Cypher Log Is
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Cypher Log is a client-side web application for home and life management (e.g. assets, maintenance, projects, pets). It is built on the Nostr protocol and runs in your browser. It does not operate its own servers that store your data; your data is published to and stored on Nostr relays that you configure.
              </p>
              <p>
                The application is provided for organizational and personal use. It is not a substitute for professional advice (legal, financial, medical, or otherwise).
              </p>
            </CardContent>
          </Card>

          {/* Acceptable use */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-sky-600" />
                Acceptable Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                You agree to use Cypher Log only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the application or the Nostr network. You must not use the application to store or transmit illegal content, harass others, or attempt to compromise the security or availability of relays or third-party services.
              </p>
              <p>
                You are responsible for the data you publish through Cypher Log to Nostr relays. Compliance with applicable laws (including data protection and export controls) is your responsibility.
              </p>
            </CardContent>
          </Card>

          {/* Your responsibilities */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-sky-600" />
                Your Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Keys and access.</strong> You are responsible for securing your Nostr keys and any other credentials. Loss of keys may result in loss of access to or control over your data. Cypher Log does not store or recover your private keys.
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Data you enter.</strong> You are solely responsible for the accuracy, legality, and sensitivity of the information you store. Do not enter highly sensitive data (e.g. full financial or medical identifiers) unless you understand and accept the risks. See our Privacy Policy for more detail.
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Relays and third parties.</strong> Your data is stored on third-party Nostr relays. Their availability, policies, and data handling are outside our control. Use of relays and any linked services (e.g. file hosting) is at your own risk.
              </p>
            </CardContent>
          </Card>

          {/* Disclaimer / no warranty */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="h-5 w-5 text-sky-600" />
                Disclaimer of Warranties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Cypher Log is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not warrant that the application will be uninterrupted, error-free, or secure, or that data will not be lost, delayed, or altered by relays or network conditions.
              </p>
              <p>
                You use the application entirely at your own risk.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of liability */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="h-5 w-5 text-sky-600" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                To the fullest extent permitted by law, the developers and contributors of Cypher Log shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the application, including but not limited to loss of data, loss of keys, relay failures, security breaches, or reliance on the accuracy of any content.
              </p>
              <p>
                In no event shall our aggregate liability exceed the amount you paid to use Cypher Log in the twelve months preceding the claim (and if you paid nothing, that amount is zero).
              </p>
            </CardContent>
          </Card>

          {/* Changes to terms */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-sky-600" />
                Changes to These Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                We may update these Terms from time to time. The &quot;Last updated&quot; date at the top of this page will be revised when we do. Continued use of Cypher Log after changes constitutes acceptance of the updated Terms. We encourage you to review this page periodically.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-sky-600" />
                Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                For questions about these Terms or Cypher Log, please see the project repository or documentation linked from the application or our website.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer links */}
        <div className="text-center space-y-4 mt-10">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/faq" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              FAQ
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link to="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Privacy Policy
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

export default Terms;
