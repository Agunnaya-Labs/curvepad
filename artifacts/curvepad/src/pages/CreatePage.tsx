import { useState } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { useLocation } from "wouter";
import { FACTORY_ADDRESS, FACTORY_ABI, BASE_PRICE, SLOPE } from "@/lib/web3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BondingCurveChart } from "@/components/BondingCurveChart";
import { Zap, AlertCircle, CheckCircle2, Loader2, ExternalLink, ChevronDown, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DEPLOY_COST = parseEther("0.002");

export default function CreatePage() {
  const [, setLocation] = useLocation();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isFactoryDeployed = FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  const deployedTokenAddress = isSuccess && receipt?.logs?.[0]?.address
    ? receipt.logs[0].address
    : null;

  const handleDeploy = async () => {
    if (!name || !symbol) {
      toast({ title: "Missing fields", description: "Enter a token name and symbol.", variant: "destructive" });
      return;
    }
    if (!isFactoryDeployed) {
      toast({ title: "Factory not deployed", description: "Configure FACTORY_ADDRESS first.", variant: "destructive" });
      return;
    }
    if (!isConnected) {
      toast({ title: "Connect wallet", description: "Connect your wallet to deploy.", variant: "destructive" });
      return;
    }

    try {
      writeContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [name, symbol],
        value: DEPLOY_COST,
      });
    } catch (err) {
      toast({ title: "Transaction failed", description: String(err), variant: "destructive" });
    }
  };

  const demoSupply = BigInt(0);

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">Launch</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Deploy a Token</h1>
          <p className="text-sm text-muted-foreground">
            One transaction. No liquidity pool. Price set by math.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-lg border border-border/40 bg-card/60 p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Token Details</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="token-name" className="text-xs text-muted-foreground mb-1.5 block">
                    Token Name
                  </Label>
                  <Input
                    id="token-name"
                    placeholder="e.g. My Awesome Token"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-sm bg-background/50"
                    data-testid="input-token-name"
                    disabled={isPending || isConfirming}
                  />
                </div>

                <div>
                  <Label htmlFor="token-symbol" className="text-xs text-muted-foreground mb-1.5 block">
                    Token Symbol
                  </Label>
                  <Input
                    id="token-symbol"
                    placeholder="e.g. MAT"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="h-9 text-sm bg-background/50 font-mono"
                    maxLength={8}
                    data-testid="input-token-symbol"
                    disabled={isPending || isConfirming}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/40 bg-card/60 p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Curve Parameters</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Curve Type", value: "Linear", mono: false },
                  { label: "Base Price", value: `${Number(BASE_PRICE) / 1e18} ETH`, mono: true },
                  { label: "Price Slope", value: `${Number(SLOPE)} wei / token`, mono: true },
                  { label: "Creator Fee", value: "1% per trade", mono: false },
                  { label: "Deploy Cost", value: "~0.002 ETH", mono: true },
                  { label: "Rug Risk", value: "Zero (math-backed)", mono: false },
                ].map((item) => (
                  <div key={item.label} className="rounded-md bg-background/40 p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className={`text-xs font-semibold text-foreground ${item.mono ? "font-mono" : ""}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border/40 bg-card/60 p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Reserve Invariant</h2>
              <div className="font-mono text-xs space-y-1 text-muted-foreground">
                <div>
                  <span className="text-primary">reserve</span> = BASE_PRICE × S + SLOPE × S² / 2
                </div>
                <div className="text-foreground/40 text-xs">Every token can always be redeemed.</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-border/40 bg-card/60 p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Price Curve Preview</h2>
              <BondingCurveChart currentSupply={demoSupply} height={220} />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Your token starts at the bottom left and climbs as buyers push supply up.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/80 p-4 space-y-3">
              {isSuccess && deployedTokenAddress ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Token Launched!</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {deployedTokenAddress}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-primary text-primary-foreground"
                      onClick={() => setLocation(`/token/${deployedTokenAddress}`)}
                      data-testid="button-go-to-token"
                    >
                      Trade Now <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      asChild
                    >
                      <a
                        href={`https://basescan.org/address/${deployedTokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="link-deployed-basescan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {!isFactoryDeployed && (
                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-destructive">
                        Factory not deployed. Set FACTORY_ADDRESS in src/lib/web3.ts.
                      </p>
                    </div>
                  )}

                  {txHash && isConfirming && (
                    <div className="flex items-center gap-2 p-2.5 rounded-md bg-primary/10 border border-primary/20">
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      <p className="text-xs text-primary">Confirming on Base...</p>
                    </div>
                  )}

                  {isConnected ? (
                    <Button
                      className="w-full h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      onClick={handleDeploy}
                      disabled={!name || !symbol || isPending || isConfirming || !isFactoryDeployed}
                      data-testid="button-deploy-token"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Waiting for wallet...
                        </>
                      ) : isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Deploy Token — 0.002 ETH
                        </>
                      )}
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="w-full h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                          data-testid="button-connect-to-deploy"
                        >
                          Connect Wallet to Deploy
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-52">
                        {connectors.map((connector) => (
                          <DropdownMenuItem
                            key={connector.uid}
                            onClick={() => connect({ connector })}
                          >
                            {connector.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    Deploying to Base mainnet. Requires a wallet with ETH.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
