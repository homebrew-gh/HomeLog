import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Home, ArrowLeft, Scale, FileText, Code, Users, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

export function License() {
  useSeoMeta({
    title: 'License - Home Log',
    description: 'MIT License information for Home Log - an open-source home management application.',
  });

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
            <Scale className="h-8 w-8 text-sky-600 dark:text-sky-300" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            MIT License
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Open Source Software License
          </p>
        </div>

        {/* Quick Summary */}
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 mb-6">
          <CardContent className="pt-6">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Home Log is open-source software released under the MIT License. This means you're free to use, modify, and distribute the software with minimal restrictions.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <Code className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300 text-sm">Free to Use</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Commercial and personal use</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300 text-sm">Modify Freely</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Adapt to your needs</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-300 text-sm">Distribute</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Share with others</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">Attribution</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Keep copyright notice</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full License Text */}
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-sky-600" />
              Full License Text
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 font-mono text-sm text-slate-700 dark:text-slate-300 space-y-4 overflow-x-auto">
              <p className="font-bold text-center text-base">MIT License</p>
              
              <p>Copyright (c) 2026 homebrew-gh</p>
              
              <p>
                Permission is hereby granted, free of charge, to any person obtaining a copy
                of this software and associated documentation files (the "Software"), to deal
                in the Software without restriction, including without limitation the rights
                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                copies of the Software, and to permit persons to whom the Software is
                furnished to do so, subject to the following conditions:
              </p>
              
              <p>
                The above copyright notice and this permission notice shall be included in all
                copies or substantial portions of the Software.
              </p>
              
              <p className="uppercase text-xs leading-relaxed">
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                SOFTWARE.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What This Means */}
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-sky-600" />
              What This Means for You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="space-y-3">
              <p className="font-medium text-slate-800 dark:text-slate-200">You CAN:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Use Home Log for personal or commercial purposes</li>
                <li>Modify the source code to fit your needs</li>
                <li>Distribute copies of Home Log</li>
                <li>Include Home Log in your own projects</li>
                <li>Sell products that include Home Log</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <p className="font-medium text-slate-800 dark:text-slate-200">You MUST:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Include the original copyright notice in any copies</li>
                <li>Include the license text when distributing</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <p className="font-medium text-slate-800 dark:text-slate-200">You CANNOT:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Hold the authors liable for any issues</li>
                <li>Expect any warranty or guarantee</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Source Code */}
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code className="h-5 w-5 text-sky-600" />
              Source Code
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400">
            <p className="mb-4">
              Home Log is open source and the complete source code is available on GitHub:
            </p>
            <a 
              href="https://github.com/homebrew-gh/HomeLog.git" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
            >
              <GitBranch className="h-4 w-4" />
              View on GitHub
            </a>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-3">
            <Link to="/faq" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              FAQ
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link to="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Privacy Policy
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

export default License;
