import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { Link } from "wouter";
import { base } from "wagmi/chains";
import { FACTORY_ADDRESS, FACTORY_ABI, BONDING_CURVE_ABI, formatEth, formatTokens, shortenAddress } from "@/lib/web3";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, Clock, Zap, ArrowUpRight } from "lucide-react";

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  currentPrice: bigint;
  totalSupply: bigint;
  marketCap: bigint;
  creator: string;
  creatorFees: bigint;
}

export default function ExplorePage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "marketcap">("newest");
  const publicClient = usePublicClient({ chainId: base.id });

  useEffect(() => {
    let cancelled = false;

    async function fetchTokens() {
      if (!publicClient) return;
      try {
        let addresses: string[] = [];

        if (FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000") {
          const result = await publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "getTokens",
          });
          addresses = result as string[];
        }

        if (addresses.length === 0) {
          if (!cancelled) {
            setTokens([]);
            setLoading(false);
          }
          return;
        }

        const infos: TokenInfo[] = [];
        for (const addr of addresses) {
          try {
            const [name, symbol, currentPrice, totalSupply, marketCap, creator, creatorFees] =
              await Promise.all([
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "name",
                }),
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "symbol",
                }),
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "getCurrentPrice",
                }),
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "totalSupply",
                }),
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "getMarketCap",
                }),
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "creator",
                }),
                publicClient.readContract({
                  address: addr as `0x${string}`,
                  abi: BONDING_CURVE_ABI,
                  functionName: "creatorFeesEarned",
                }),
              ]);
            infos.push({
              address: addr,
              name: name as string,
              symbol: symbol as string,
              currentPrice: currentPrice as bigint,
              totalSupply: totalSupply as bigint,
              marketCap: marketCap as bigint,
              creator: creator as string,
              creatorFees: creatorFees as bigint,
            });
          } catch {
          }
        }

        if (!cancelled) {
          setTokens(infos);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTokens();
    const interval = setInterval(fetchTokens, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicClient]);

  const filtered = tokens
    .filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.symbol.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "marketcap") {
        return Number(b.marketCap - a.marketCap);
      }
      return 0;
    });

  const isFactoryDeployed = FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">Base Network</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Token Launchpad
          </h1>
          <p className="text-sm text-muted-foreground">
            Permissionless bonding curve tokens. Price is a function, not a negotiation.
          </p>
        </div>

        {!isFactoryDeployed && (
          <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Factory Not Yet Deployed</p>
                <p className="text-xs text-muted-foreground">
                  The TokenFactory contract hasn't been deployed to Base mainnet yet.
                  Configure the <code className="text-primary">FACTORY_ADDRESS</code> in{" "}
                  <code className="text-primary">src/lib/web3.ts</code> after deployment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-card/50 border-border/60 text-sm"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortBy("newest")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                sortBy === "newest"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-card/50 text-muted-foreground border border-border/40 hover:border-border"
              }`}
              data-testid="button-sort-newest"
            >
              <Clock className="w-3.5 h-3.5" />
              Newest
            </button>
            <button
              onClick={() => setSortBy("marketcap")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                sortBy === "marketcap"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-card/50 text-muted-foreground border border-border/40 hover:border-border"
              }`}
              data-testid="button-sort-marketcap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Top Market Cap
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                <Skeleton className="h-5 w-32 bg-muted/40" />
                <Skeleton className="h-4 w-20 bg-muted/40" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-muted/40" />
                  <Skeleton className="h-4 w-3/4 bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {search ? "No tokens found" : "No tokens launched yet"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {search ? "Try a different search term" : "Be the first to launch a token on CurvePad"}
            </p>
            <Link href="/create">
              <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Zap className="w-3.5 h-3.5" />
                Launch a Token
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((token) => (
              <Link key={token.address} href={`/token/${token.address}`}>
                <div
                  className="group rounded-lg border border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card transition-all cursor-pointer p-4"
                  data-testid={`card-token-${token.address}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {token.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs font-mono border-border/50 text-muted-foreground h-4 px-1.5"
                        >
                          {token.symbol}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        by {shortenAddress(token.creator)}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-background/50 p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                      <p className="text-xs font-mono font-semibold text-foreground" data-testid={`text-price-${token.address}`}>
                        {formatEth(token.currentPrice, 8)} ETH
                      </p>
                    </div>
                    <div className="rounded-md bg-background/50 p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Market Cap</p>
                      <p className="text-xs font-mono font-semibold text-primary" data-testid={`text-mcap-${token.address}`}>
                        {formatEth(token.marketCap, 4)} ETH
                      </p>
                    </div>
                    <div className="rounded-md bg-background/50 p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Supply</p>
                      <p className="text-xs font-mono text-foreground" data-testid={`text-supply-${token.address}`}>
                        {formatTokens(token.totalSupply)}
                      </p>
                    </div>
                    <div className="rounded-md bg-background/50 p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Creator Fees</p>
                      <p className="text-xs font-mono text-foreground" data-testid={`text-fees-${token.address}`}>
                        {formatEth(token.creatorFees, 5)} ETH
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
