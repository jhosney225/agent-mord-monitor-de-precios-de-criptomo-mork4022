
```javascript
import Anthropic from "@anthropic-ai/sdk";
import https from "https";

const client = new Anthropic();

// In-memory storage for monitored cryptocurrencies and alerts
interface CryptoPrice {
  symbol: string;
  currentPrice: number;
  lastPrice: number;
  timestamp: Date;
}

interface PriceAlert {
  symbol: string;
  threshold: number;
  type: "above" | "below";
  triggered: boolean;
}

const monitored: Map<string, CryptoPrice> = new Map();
const alerts: Map<string, PriceAlert[]> = new Map();

// Tool to fetch crypto prices
function fetchCryptoPrices(symbols: string[]): object {
  const prices: Record<string, number> = {
    bitcoin: 45230.5,
    ethereum: 2380.75,
    cardano: 0.98,
    solana: 102.45,
    ripple: 2.15,
  };

  return symbols.reduce(
    (acc, symbol) => {
      const lower = symbol.toLowerCase();
      if (lower in prices) {
        acc[symbol] = prices[lower];
      } else {
        acc[symbol] = Math.random() * 1000 + 100; // Simulated price
      }
      return acc;
    },
    {} as Record<string, number>
  );
}

// Tool to set price alerts
function setPriceAlert(
  symbol: string,
  threshold: number,
  type: "above" | "below"
): object {
  if (!alerts.has(symbol)) {
    alerts.set(symbol, []);
  }

  const alert: PriceAlert = {
    symbol,
    threshold,
    type,
    triggered: false,
  };

  alerts.get(symbol)!.push(alert);

  return {
    success: true,
    message: `Alert set for ${symbol} - Price ${type} $${threshold}`,
    alert,
  };
}

// Tool to get current monitoring status
function getMonitoringStatus(): object {
  const status: Record<string, object> = {};

  monitored.forEach((crypto, symbol) => {
    const cryptoAlerts = alerts.get(symbol) || [];
    status[symbol] = {
      currentPrice: crypto.currentPrice,
      lastPrice: crypto.lastPrice,
      change:
        crypto.lastPrice !== 0
          ? (
              ((crypto.currentPrice - crypto.lastPrice) / crypto.lastPrice) *
              100
            ).toFixed(2) + "%"
          : "N/A",
      activeAlerts: cryptoAlerts.length,
      alerts: cryptoAlerts,
    };
  });

  return {
    monitoredCryptos: monitored.size,
    totalAlerts: Array.from(alerts.values()).reduce(
      (sum, arr) => sum + arr.length,
      0
    ),
    status,
  };
}

// Tool to start monitoring a cryptocurrency
function startMonitoring(symbol: string, initialPrice: number): object {
  monitored.set(symbol, {
    symbol,
    currentPrice: initialPrice,
    lastPrice: initialPrice,
    timestamp: new Date(),
  });

  return {
    success: true,
    message: `Started monitoring ${symbol} at $${initialPrice}`,
  };
}

// Tool to update crypto prices
function updateCryptoPrices(priceUpdates: Record<string, number>): object {
  const updates: Record<string, object> = {};

  Object.entries(priceUpdates).forEach(([symbol, newPrice]) => {
    if (monitored.has(symbol)) {
      const crypto = monitored.get(symbol)!;
      const oldPrice = crypto.currentPrice;
      crypto.lastPrice = oldPrice;
      crypto.currentPrice = newPrice;
      crypto.timestamp = new Date();

      // Check alerts
      const symbolAlerts = alerts.get(symbol) || [];
      const triggered: string[] = [];

      symbolAlerts.forEach((alert) => {
        if (alert.type === "above" && newPrice > alert.threshold) {
          triggered.push(
            `⚠️  ALERT: ${symbol} price ($${newPrice}) exceeded ${alert.threshold}!`
          );
        } else if (alert.type === "below" && newPrice < alert.threshold) {
          triggered.push(
            `⚠️  ALERT: ${symbol} price ($${newPrice}) fell below ${alert.threshold}!`
          );
        }
      });

      updates[symbol] = {
        oldPrice,
        newPrice,
        change: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2) + "%",
        triggeredAlerts: triggered,
      };
    }
  });

  return { updates };
}

// Define tools for Claude
const tools = [
  {
    name: "fetch_crypto_prices",
    description: "Fetch current prices for specified cryptocurrencies",
    input_schema: {
      type: "object",
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "List of cryptocurrency symbols to fetch prices for",
        },
      },
      required: ["symbols"],
    },
  },
  {
    name: "set_price_alert",
    description: "Set a price alert for a cryptocurrency",
    input_schema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Cryptocurrency symbol",
        },
        threshold: {
          type: "number",
          description: "Price threshold for the alert",
        },
        type: {
          type: "string",
          enum: ["above", "below"],
          description: "Alert triggers when price goes above or below threshold",
        },
      },
      required: ["symbol", "threshold", "type"],
    },
  },
  {
    name: "start_monitoring",
    description: "Start monitoring a cryptocurrency at a given price",
    input