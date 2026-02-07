import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import {
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  Bot,
  AlertCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import {
  buildDelegationString,
  buildConditionsQuery,
  createDelegationToken,
  buildDelegationTag,
  trySignDelegationWithBrowserSigner,
} from '@/lib/nip26';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { nip19 } from 'nostr-tools';
import {
  APPLIANCE_KIND,
  VEHICLE_KIND,
  MAINTENANCE_KIND,
  WARRANTY_KIND,
  PET_KIND,
  PROJECT_KIND,
} from '@/lib/types';

const DELEGATION_KIND_OPTIONS: { kind: number; label: string }[] = [
  { kind: 1, label: 'Notes (kind 1)' },
  { kind: 4, label: 'Direct messages (kind 4)' },
  { kind: APPLIANCE_KIND, label: 'Appliances' },
  { kind: VEHICLE_KIND, label: 'Vehicles' },
  { kind: MAINTENANCE_KIND, label: 'Maintenance' },
  { kind: WARRANTY_KIND, label: 'Warranties' },
  { kind: PET_KIND, label: 'Pets' },
  { kind: PROJECT_KIND, label: 'Projects' },
];

function copyToClipboard(text: string, toast: ReturnType<typeof useToast>['toast']) {
  navigator.clipboard.writeText(text).then(
    () => toast({ title: 'Copied to clipboard' }),
    () => toast({ title: 'Failed to copy', variant: 'destructive' })
  );
}

export function DelegationPage() {
  useSeoMeta({ title: 'NIP-26 Delegation – Cypher Log', description: 'Create or re-issue delegation for Open Claw and other agents.' });
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();

  const [delegateeSecretKey, setDelegateeSecretKey] = useState<Uint8Array | null>(null);
  const [delegateePubkeyHex, setDelegateePubkeyHex] = useState<string>('');
  const [reissueDelegateeInput, setReissueDelegateeInput] = useState('');
  const [selectedKinds, setSelectedKinds] = useState<number[]>([1]);
  const [validFrom, setValidFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [validTo, setValidTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [nsecInput, setNsecInput] = useState('');
  const [createdTag, setCreatedTag] = useState<[string, string, string, string] | null>(null);
  const [reissuedTag, setReissuedTag] = useState<[string, string, string, string] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const relayUrls = config.relayMetadata.relays.map((r) => r.url).filter(Boolean);

  const handleGenerateKey = useCallback(() => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    setDelegateeSecretKey(sk);
    setDelegateePubkeyHex(pk);
    setCreatedTag(null);
  }, []);

  const toggleKind = useCallback((kind: number) => {
    setSelectedKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind].sort((a, b) => a - b)
    );
  }, []);

  const createDelegation = useCallback(async () => {
    if (!user) return;
    const pubkeyHex = delegateePubkeyHex || (delegateeSecretKey && getPublicKey(delegateeSecretKey));
    if (!pubkeyHex) {
      toast({ title: 'Generate a delegatee key first', variant: 'destructive' });
      return;
    }
    if (selectedKinds.length === 0) {
      toast({ title: 'Select at least one event kind', variant: 'destructive' });
      return;
    }
    const fromTs = Math.floor(new Date(validFrom).getTime() / 1000);
    const toTs = Math.floor(new Date(validTo).getTime() / 1000);
    if (fromTs >= toTs) {
      toast({ title: 'Valid "to" must be after "from"', variant: 'destructive' });
      return;
    }
    const conditions = buildConditionsQuery(selectedKinds, fromTs, toTs);
    const delegationString = buildDelegationString(pubkeyHex, conditions);
    setIsSigning(true);
    let token: string | null = null;
    try {
      token = await trySignDelegationWithBrowserSigner(delegationString, user.pubkey);
    } finally {
      setIsSigning(false);
    }
    if (!token && nsecInput.trim()) {
      try {
        const decoded = nip19.decode(nsecInput.trim());
        if (decoded.type !== 'nsec') throw new Error('Not an nsec');
        const secretBytes = decoded.data as Uint8Array;
        token = createDelegationToken(delegationString, secretBytes);
        setNsecInput('');
      } catch {
        toast({
          title: 'Invalid nsec',
          description: 'Check the key and try again. It is used only in memory and never stored.',
          variant: 'destructive',
        });
        return;
      }
    }
    if (!token) {
      toast({
        title: 'Sign with your key',
        description: 'Your extension doesn’t support delegation signing. Enter your nsec below (used only in memory, never stored) and try again.',
        variant: 'destructive',
      });
      return;
    }
    const tag = buildDelegationTag(user.pubkey, conditions, token);
    setCreatedTag(tag);
    toast({ title: 'Delegation created' });
  }, [
    user,
    delegateeSecretKey,
    delegateePubkeyHex,
    selectedKinds,
    validFrom,
    validTo,
    nsecInput,
    toast,
  ]);

  const reissueDelegation = useCallback(async () => {
    if (!user) return;
    let delegateeHex = reissueDelegateeInput.trim();
    if (delegateeHex.startsWith('npub')) {
      try {
        const decoded = nip19.decode(delegateeHex);
        if (decoded.type !== 'npub') throw new Error('Not npub');
        delegateeHex = decoded.data as string;
      } catch {
        toast({ title: 'Invalid npub', variant: 'destructive' });
        return;
      }
    } else if (delegateeHex.length !== 64 || !/^[a-f0-9]+$/i.test(delegateeHex)) {
      toast({ title: 'Enter a valid delegatee npub or 64-char hex pubkey', variant: 'destructive' });
      return;
    }
    if (selectedKinds.length === 0) {
      toast({ title: 'Select at least one event kind', variant: 'destructive' });
      return;
    }
    const fromTs = Math.floor(new Date(validFrom).getTime() / 1000);
    const toTs = Math.floor(new Date(validTo).getTime() / 1000);
    if (fromTs >= toTs) {
      toast({ title: 'Valid "to" must be after "from"', variant: 'destructive' });
      return;
    }
    const conditions = buildConditionsQuery(selectedKinds, fromTs, toTs);
    const delegationString = buildDelegationString(delegateeHex, conditions);
    setIsSigning(true);
    let token: string | null = null;
    try {
      token = await trySignDelegationWithBrowserSigner(delegationString, user.pubkey);
    } finally {
      setIsSigning(false);
    }
    if (!token && nsecInput.trim()) {
      try {
        const decoded = nip19.decode(nsecInput.trim());
        if (decoded.type !== 'nsec') throw new Error('Not an nsec');
        const secretBytes = decoded.data as Uint8Array;
        token = createDelegationToken(delegationString, secretBytes);
        setNsecInput('');
      } catch {
        toast({
          title: 'Invalid nsec',
          variant: 'destructive',
        });
        return;
      }
    }
    if (!token) {
      toast({
        title: 'Sign with your key',
        description: 'Your extension doesn’t support delegation signing. Enter your nsec below (used only in memory, never stored) and try again.',
        variant: 'destructive',
      });
      return;
    }
    const tag = buildDelegationTag(user.pubkey, conditions, token);
    setReissuedTag(tag);
    toast({ title: 'Delegation re-issued' });
  }, [user, reissueDelegateeInput, selectedKinds, validFrom, validTo, nsecInput, toast]);

  const copy = (id: string, text: string) => {
    copyToClipboard(text, toast);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">You need to be logged in to create or re-issue delegations.</p>
              <Button asChild variant="default">
                <Link to="/">Go to home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const delegateeNpub = delegateePubkeyHex ? nip19.npubEncode(delegateePubkeyHex) : '';
  const delegateeNsec = delegateeSecretKey ? nip19.nsecEncode(delegateeSecretKey) : '';

  return (
    <div className="min-h-screen bg-theme-gradient tool-pattern-bg">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <KeyRound className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">NIP-26 Delegation</h1>
          </div>
        </div>

        <Tabs defaultValue="instructions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="reissue">Re-issue</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Using delegation with Open Claw
                </CardTitle>
                <CardDescription>
                  Give your Open Claw agent limited permission to post events as you (notes, DMs, or Cypher Log kinds) without sharing your main private key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                <div>
                  <h4 className="font-medium mb-2">1. Create a delegation</h4>
                  <p className="text-muted-foreground">
                    Use the <strong>Create</strong> tab to generate a new delegatee key and a signed delegation (conditions + token). Copy the <strong>delegatee nsec</strong> and the <strong>delegation tag</strong> (or full credentials block).
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">2. Configure Open Claw</h4>
                  <p className="text-muted-foreground mb-2">
                    In your Open Claw Nostr channel config, set:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li><strong>privateKey</strong> to the delegatee nsec (from Create).</li>
                    <li>If your Open Claw build supports NIP-26, add the delegation tag so events are published as you; otherwise the agent will post as the delegatee identity.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">3. Relays</h4>
                  <p className="text-muted-foreground">
                    Use the same relay list as Cypher Log so events appear here. Copy the relay list from the Create tab and add it to Open Claw&apos;s <code className="bg-muted px-1 rounded">relays</code> config.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">4. NIP-42 (whitelisted relays)</h4>
                  <p className="text-muted-foreground">
                    If your relay uses NIP-42 and only allows certain pubkeys, add the <strong>delegatee npub</strong> to the relay&apos;s whitelist so the agent can authenticate and publish.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">5. Re-issue after timeout</h4>
                  <p className="text-muted-foreground">
                    When the delegation time window expires, use the <strong>Re-issue</strong> tab with the same delegatee npub and a new date range. Give the new delegation tag to the agent; the delegatee key stays the same.
                  </p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground text-xs">
                    We try to sign the delegation with your browser extension first (e.g. Alby with signSchnorr). If your signer doesn’t support that, you can enter your nsec once to create or re-issue; it is used only in memory and is never stored or sent.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create new delegation</CardTitle>
                <CardDescription>
                  Generate a delegatee key and sign a time-limited delegation for your agent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Delegatee keypair</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateKey}>
                      Generate new key
                    </Button>
                    {delegateePubkeyHex && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copy('delegatee-npub', delegateeNpub)}
                        >
                          {copiedId === 'delegatee-npub' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          Copy npub
                        </Button>
                        {delegateeNsec && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy('delegatee-nsec', delegateeNsec)}
                          >
                            {copiedId === 'delegatee-nsec' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            Copy nsec
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  {delegateePubkeyHex && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Give the nsec to your agent. Add the npub to any NIP-42 relay whitelist.
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">Allowed event kinds</Label>
                  <div className="flex flex-wrap gap-4">
                    {DELEGATION_KIND_OPTIONS.map(({ kind, label }) => (
                      <label key={kind} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedKinds.includes(kind)}
                          onCheckedChange={() => toggleKind(kind)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valid-from">Valid from (date)</Label>
                    <Input
                      id="valid-from"
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="valid-to">Valid to (date)</Label>
                    <Input
                      id="valid-to"
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nsec-create">Your nsec (only if your extension can’t sign)</Label>
                  <Input
                    id="nsec-create"
                    type="password"
                    placeholder="nsec1..."
                    value={nsecInput}
                    onChange={(e) => setNsecInput(e.target.value)}
                    className="mt-1 font-mono text-sm"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We try your browser signer first. Enter nsec only if prompted (used in memory, never stored).
                  </p>
                </div>

                <Button onClick={() => void createDelegation()} disabled={!delegateePubkeyHex || isSigning}>
                  {isSigning ? 'Signing…' : 'Create delegation'}
                </Button>

                {createdTag && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Delegation tag (give to agent)</Label>
                    <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto break-all font-mono">
                      {JSON.stringify(createdTag)}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copy('delegation-tag', JSON.stringify(createdTag))}
                    >
                      {copiedId === 'delegation-tag' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Copy tag
                    </Button>
                    <div>
                      <Label className="text-muted-foreground">Your relay list (for Open Claw config)</Label>
                      <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto mt-1 font-mono">
                        {JSON.stringify(relayUrls)}
                      </pre>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copy('relays', JSON.stringify(relayUrls))}
                      >
                        {copiedId === 'relays' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copy relays
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reissue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Re-issue delegation (same key, new time window)
                </CardTitle>
                <CardDescription>
                  After the delegation expires, re-issue with the same delegatee npub and a new valid-from / valid-to. The agent keeps the same nsec; you only update the delegation tag.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="reissue-pubkey">Delegatee pubkey (npub or hex)</Label>
                  <Input
                    id="reissue-pubkey"
                    type="text"
                    placeholder="npub1... or 64-char hex"
                    value={reissueDelegateeInput}
                    onChange={(e) => setReissueDelegateeInput(e.target.value)}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Allowed event kinds</Label>
                  <div className="flex flex-wrap gap-4">
                    {DELEGATION_KIND_OPTIONS.map(({ kind, label }) => (
                      <label key={kind} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedKinds.includes(kind)}
                          onCheckedChange={() => toggleKind(kind)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reissue-from">Valid from (date)</Label>
                    <Input
                      id="reissue-from"
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reissue-to">Valid to (date)</Label>
                    <Input
                      id="reissue-to"
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nsec-reissue">Your nsec (only if your extension can’t sign)</Label>
                  <Input
                    id="nsec-reissue"
                    type="password"
                    placeholder="nsec1..."
                    value={nsecInput}
                    onChange={(e) => setNsecInput(e.target.value)}
                    className="mt-1 font-mono text-sm"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We try your browser signer first. Enter nsec only if prompted (used in memory, never stored).
                  </p>
                </div>

                <Button onClick={() => void reissueDelegation()} disabled={isSigning}>
                  {isSigning ? 'Signing…' : 'Re-issue delegation'}
                </Button>

                {reissuedTag && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label>New delegation tag (give to agent)</Label>
                    <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto break-all font-mono">
                      {JSON.stringify(reissuedTag)}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copy('reissue-tag', JSON.stringify(reissuedTag))}
                    >
                      {copiedId === 'reissue-tag' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Copy tag
                    </Button>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Update the agent config with this new tag. The delegatee nsec does not change.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
