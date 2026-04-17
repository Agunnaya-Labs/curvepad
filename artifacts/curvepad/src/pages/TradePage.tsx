import { useState, useEffect } from "react";
import { useParams } from "wouter";
import {
  usePublicClient,
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { base } from "wagmi/chains";
import {
  BONDING_CURVE_ABI,
  formatEth,
  formatTokens,
  shortenAddress,
  calcBuyTokens,
  calcSellReturn,
} from "@/lib/web3";
import { BondingCurveChart } from "@/components/BondingCurveChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Loader2,
  ChevronDown,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TradePage() {
  const params = useParams<{ address: string }>();
  const tokenAddress = params.address as `0x${string}`;
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { toast } = useToast();
  const publicClient = usePublicClient({ chainId: base.id });

  const [buyEth, setBuyEth] = useState("");
  const [sellTokens, setSellTokens] = useState("");
  const [activeTab, setActiveTab] = useState("buy");

  const { data: name } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "name", chainId: base.id });
  const { data: symbol } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "symbol", chainId: base.id });
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "totalSupply", chainId: base.id });
  const { data: currentPrice, refetch: refetchPrice } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "getCurrentPrice", chainId: base.id });
  const { data: marketCap } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "getMarketCap", chainId: base.id });
  const { data: creator } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "creator", chainId: base.id });
  const { data: creatorFees, refetch: refetchFees } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "creatorFeesEarned", chainId: base.id });
  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: BONDING_CURVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: base.id,
  });

  const { writeContract: buy, data: buyTxHash, isPending: isBuying } = useWriteContract();
  const { writeContract: sell, data: sellTxHash, isPending: isSelling } = useWriteContract();

  const { isLoading: isBuyConfirming, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });
  const { isLoading: isSellConfirming, isSuccess: sellSuccess } = useWaitForTransactionReceipt({ hash: sellTxHash });

  useEffect(() => {
    if (buySuccess || sellSuccess) {
      refetchSupply();
      refetchPrice();
      refetchFees();
      refetchBalance();
      setBuyEth("");
      setSellTokens("");
      toast({ title: "Transaction confirmed", description: "Trade executed on Base." });
    }
  }, [buySuccess, sellSuccess]);

  const supply = (totalSupply as bigint) ?? BigInt(0);
  const price = (currentPrice as bigint) ?? BigInt(0);
  const mcap = (marketCap as bigint) ?? BigInt(0);
  const fees = (creatorFees as bigint) ?? BigInt(0);
  const userBal = (userBalance as bigint) ?? BigInt(0);

  const buyEthWei = buyEth ? parseEther(buyEth) : BigInt(0);
  const estimatedTokens = buyEthWei > BigInt(0) ? calcBuyTokens(buyEthWei, supply) : BigInt(0);

  const sellTokensWei = sellTokens ? parseEther(sellTokens) : BigInt(0);
  const estimatedEth = sellTokensWei > BigInt(0) ? calcSellReturn(sellTokensWei, supply) : BigInt(0);

  const handleBuy = () => {
    if (!buyEth || parseFloat(buyEth) <= 0) return;
    const fee = (buyEthWei * BigInt(1)) / BigInt(100);
    buy({
      address: tokenAddress,
      abi: BONDING_CURVE_ABI,
      functionName: "buy",
      value: buyEthWei + fee,
    });
  };

  const handleSell = () => {
    if (!sellTokens || parseFloat(sellTokens) <= 0) return;
    sell({
      address: tokenAddress,
      abi: BONDING_CURVE_ABI,
      functionName: "sell",
      args: [sellTokensWei],
    });
  };

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-bold text-foreground" data-testid="text-token-name">
                {name as string || "Loading..."}
              </h1>
              {symbol && (
                <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40" data-testid="text-token-symbol">
                  {symbol as string}
                </span>
              )}
            </div>
            {creator && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>by</span>
                <a
                  href={`https://basescan.org/address/${creator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-primary transition-colors flex items-center gap-1"
                  data-testid="link-creator"
                >
                  {shortenAddress(creator as string)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
          <a
            href={`https://basescan.org/address/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            data-testid="link-token-basescan"
          >
            <span className="font-mono">{shortenAddress(tokenAddress)}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Current Price", value: `${formatEth(price, 8)} ETH`, highlight: true, testId: "text-current-price" },
            { label: "Market Cap", value: `${formatEth(mcap, 4)} ETH`, highlight: false, testId: "text-market-cap" },
            { label: "Total Supply", value: formatTokens(supply), highlight: false, testId: "text-total-supply" },
            { label: "Creator Fees", value: `${formatEth(fees, 5)} ETH`, highlight: false, testId: "text-creator-fees" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border/40 bg-card/60 p-3"
              data-testid={stat.testId}
            >
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-sm font-mono font-semibold ${stat.highlight ? "text-primary" : "text-foreground"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-lg border border-border/40 bg-card/60 p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Bonding Curve</h2>
              <BondingCurveChart
                currentSupply={supply}
                pendingEth={activeTab === "buy" ? buyEthWei : undefined}
                pendingTokens={activeTab === "buy" ? estimatedTokens : sellTokensWei}
                isBuy={activeTab === "buy"}
                height={280}
              />
            </div>

            <div className="rounded-lg border border-border/40 bg-card/60 p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Trade Activity</h2>
              <ActivityFeed tokenAddress={tokenAddress} />
            </div>
          </div>

          <div className="space-y-4">
            {isConnected && userBal > BigInt(0) && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Your balance</p>
                <p className="text-sm font-mono font-semibold text-primary" data-testid="text-user-balance">
                  {formatTokens(userBal)} {symbol as string}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border/40 bg-card/60 p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full mb-4 h-8">
                  <TabsTrigger
                    value="buy"
                    className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    data-testid="tab-buy"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                    Buy
                  </TabsTrigger>
                  <TabsTrigger
                    value="sell"
                    className="flex-1 text-xs data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
                    data-testid="tab-sell"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                    Sell
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="buy" className="space-y-3 mt-0">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      ETH to spend
                    </label>
                    <Input
                      placeholder="0.0"
                      value={buyEth}
                      onChange={(e) => setBuyEth(e.target.value)}
                      className="h-9 text-sm bg-background/50 font-mono"
                      type="number"
                      min="0"
                      step="0.001"
                      data-testid="input-buy-eth"
                    />
                  </div>

                  {estimatedTokens > BigInt(0) && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">You receive (estimated)</p>
                      <p className="text-sm font-mono font-semibold text-primary" data-testid="text-buy-estimate">
                        {formatTokens(estimatedTokens)} {symbol as string || "tokens"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        +1% creator fee on top
                      </p>
                    </div>
                  )}

                  {isConnected ? (
                    <Button
                      className="w-full h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      onClick={handleBuy}
                      disabled={!buyEth || parseFloat(buyEth) <= 0 || isBuying || isBuyConfirming}
                      data-testid="button-buy"
                    >
                      {isBuying || isBuyConfirming ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {isBuying ? "Confirm in wallet..." : "Confirming..."}</>
                      ) : (
                        <><Zap className="w-3.5 h-3.5 mr-1.5" /> Buy {symbol as string || "tokens"}</>
                      )}
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-full h-9 text-xs" data-testid="button-connect-to-buy">
                          Connect Wallet <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {connectors.map((c) => (
                          <DropdownMenuItem key={c.uid} onClick={() => connect({ connector: c })}>
                            {c.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {buyTxHash && (
                    <a
                      href={`https://basescan.org/tx/${buyTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      data-testid="link-buy-tx"
                    >
                      <ExternalLink className="w-3 h-3" /> View on BaseScan
                    </a>
                  )}
                </TabsContent>

                <TabsContent value="sell" className="space-y-3 mt-0">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      Tokens to sell
                    </label>
                    <Input
                      placeholder="0.0"
                      value={sellTokens}
                      onChange={(e) => setSellTokens(e.target.value)}
                      className="h-9 text-sm bg-background/50 font-mono"
                      type="number"
                      min="0"
                      data-testid="input-sell-tokens"
                    />
                    {isConnected && userBal > BigInt(0) && (
                      <button
                        className="text-xs text-muted-foreground hover:text-primary mt-1 transition-colors"
                        onClick={() => setSellTokens(formatEther(userBal))}
                        data-testid="button-sell-max"
                      >
                        Max: {formatTokens(userBal)} {symbol as string}
                      </button>
                    )}
                  </div>

                  {estimatedEth > BigInt(0) && (
                    <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">You receive (estimated)</p>
                      <p className="text-sm font-mono font-semibold text-destructive" data-testid="text-sell-estimate">
                        {formatEth(estimatedEth, 6)} ETH
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        After 1% creator fee
                      </p>
                    </div>
                  )}

                  {isConnected ? (
                    <Button
                      variant="destructive"
                      className="w-full h-9 text-xs font-semibold"
                      onClick={handleSell}
                      disabled={!sellTokens || parseFloat(sellTokens) <= 0 || isSelling || isSellConfirming || sellTokensWei > userBal}
                      data-testid="button-sell"
                    >
                      {isSelling || isSellConfirming ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {isSelling ? "Confirm in wallet..." : "Confirming..."}</>
                      ) : (
                        <>Sell {symbol as string || "tokens"}</>
                      )}
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-full h-9 text-xs" data-testid="button-connect-to-sell">
                          Connect Wallet <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {connectors.map((c) => (
                          <DropdownMenuItem key={c.uid} onClick={() => connect({ connector: c })}>
                            {c.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {sellTxHash && (
                    <a
                      href={`https://basescan.org/tx/${sellTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      data-testid="link-sell-tx"
                    >
                      <ExternalLink className="w-3 h-3" /> View on BaseScan
                    </a>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="rounded-lg border border-border/40 bg-card/60 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">About the Curve</h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>Price = BASE_PRICE + SLOPE × Supply</p>
                <p>Every buy mints tokens, every sell burns them.</p>
                <p>Reserve exactly equals integral — no fractional reserve.</p>
                <p className="text-primary/80">1% fee to creator on every trade.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
