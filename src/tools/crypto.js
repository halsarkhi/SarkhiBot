import axios from 'axios';
import { getLogger } from '../utils/logger.js';

export const definitions = [
  {
    name: 'crypto_price',
    description: 'Get current cryptocurrency price and market data from CoinGecko (free, no API key needed).',
    input_schema: {
      type: 'object',
      properties: {
        coin: { type: 'string', description: 'Cryptocurrency ID (e.g., "bitcoin", "ethereum", "solana", "dogecoin")' },
        currency: { type: 'string', description: 'Fiat currency for pricing (default: "usd"). Supports: usd, eur, gbp, jpy, etc.' },
      },
      required: ['coin'],
    },
  },
  {
    name: 'crypto_top',
    description: 'Get top cryptocurrencies by market cap.',
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of coins to return (default: 10, max: 25)' },
        currency: { type: 'string', description: 'Fiat currency (default: "usd")' },
      },
    },
  },
];

export const handlers = {
  crypto_price: async (params) => {
    const logger = getLogger();
    const { coin, currency = 'usd' } = params;
    try {
      const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin.toLowerCase())}`, {
        params: { localization: false, tickers: false, community_data: false, developer_data: false },
        timeout: 10000,
      });
      const d = res.data;
      const market = d.market_data;
      return {
        name: d.name,
        symbol: d.symbol?.toUpperCase(),
        price: market.current_price?.[currency],
        market_cap: market.market_cap?.[currency],
        volume_24h: market.total_volume?.[currency],
        change_24h: `${market.price_change_percentage_24h?.toFixed(2)}%`,
        change_7d: `${market.price_change_percentage_7d?.toFixed(2)}%`,
        change_30d: `${market.price_change_percentage_30d?.toFixed(2)}%`,
        ath: market.ath?.[currency],
        ath_change: `${market.ath_change_percentage?.[currency]?.toFixed(2)}%`,
        rank: d.market_cap_rank,
        currency,
      };
    } catch (err) {
      logger.error(`crypto_price failed: ${err.message}`);
      return { error: `Failed to fetch crypto price: ${err.message}` };
    }
  },
  crypto_top: async (params) => {
    const logger = getLogger();
    const { count = 10, currency = 'usd' } = params;
    const limit = Math.min(Math.max(1, count), 25);
    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: { vs_currency: currency, order: 'market_cap_desc', per_page: limit, page: 1 },
        timeout: 10000,
      });
      return {
        currency,
        coins: res.data.map(c => ({
          rank: c.market_cap_rank,
          name: c.name,
          symbol: c.symbol?.toUpperCase(),
          price: c.current_price,
          change_24h: `${c.price_change_percentage_24h?.toFixed(2)}%`,
          market_cap: c.market_cap,
        })),
      };
    } catch (err) {
      logger.error(`crypto_top failed: ${err.message}`);
      return { error: `Failed to fetch top cryptos: ${err.message}` };
    }
  },
};
