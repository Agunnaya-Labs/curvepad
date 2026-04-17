import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "CurvePad" }),
    walletConnect({
      projectId: "2d0b9b35da4a10a8c6d6cd2b55a63a3b",
    }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
});

export const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const BASE_PRICE = BigInt("1000000000000");
export const SLOPE = BigInt("1000000");

export const FACTORY_ABI = [
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
    ],
  },
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    outputs: [{ name: "token", type: "address" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getTokens",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const BONDING_CURVE_ABI = [
  {
    type: "event",
    name: "Trade",
    inputs: [
      { name: "trader", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: false },
      { name: "tokenAmount", type: "uint256", indexed: false },
      { name: "ethAmount", type: "uint256", indexed: false },
      { name: "newSupply", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentPrice",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketCap",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creatorFeesEarned",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "buy",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBuyPrice",
    inputs: [{ name: "ethAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSellReturn",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function formatEth(wei: bigint, decimals = 6): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.000001) return "<0.000001";
  return eth.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatTokens(amount: bigint, decimals = 2): string {
  const tokens = Number(amount) / 1e18;
  if (tokens >= 1_000_000) return (tokens / 1_000_000).toFixed(2) + "M";
  if (tokens >= 1_000) return (tokens / 1_000).toFixed(2) + "K";
  return tokens.toFixed(decimals);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function calcBuyTokens(ethIn: bigint, currentSupply: bigint): bigint {
  const ethInAfterFee = (ethIn * BigInt(99)) / BigInt(100);
  const B = BASE_PRICE + SLOPE * currentSupply;
  const discriminant = B * B + BigInt(2) * SLOPE * ethInAfterFee;
  const sqrtD = bigIntSqrt(discriminant);
  if (sqrtD <= B) return BigInt(0);
  return ((sqrtD - B) * BigInt(1e18)) / SLOPE;
}

export function calcSellReturn(tokenAmount: bigint, currentSupply: bigint): bigint {
  if (tokenAmount > currentSupply) return BigInt(0);
  const supplyAfter = currentSupply - tokenAmount;
  const reserveBefore =
    BASE_PRICE * currentSupply + (SLOPE * currentSupply * currentSupply) / BigInt(2);
  const reserveAfter =
    BASE_PRICE * supplyAfter + (SLOPE * supplyAfter * supplyAfter) / BigInt(2);
  const grossReturn = (reserveBefore - reserveAfter) / BigInt(1e18);
  return (grossReturn * BigInt(99)) / BigInt(100);
}

function bigIntSqrt(n: bigint): bigint {
  if (n < BigInt(0)) return BigInt(0);
  if (n === BigInt(0)) return BigInt(0);
  let x = n;
  let y = (x + BigInt(1)) / BigInt(2);
  while (y < x) {
    x = y;
    y = (x + n / x) / BigInt(2);
  }
  return x;
}

export function calcCurvePoints(
  currentSupply: bigint,
  points = 100
): { supply: number; price: number }[] {
  const supplyNum = Number(currentSupply) / 1e18;
  const maxSupply = Math.max(supplyNum * 2, 1_000_000);
  const result = [];
  for (let i = 0; i <= points; i++) {
    const s = (maxSupply * i) / points;
    const price = (Number(BASE_PRICE) + Number(SLOPE) * s) / 1e18;
    result.push({ supply: s, price });
  }
  return result;
}
