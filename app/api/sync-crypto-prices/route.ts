import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cryptos } from '@/lib/db/schema';

const BITKUB_TICKER_URL = 'https://api.bitkub.com/api/market/ticker';
const BITKUB_SYMBOLS_URL = 'https://api.bitkub.com/api/market/symbols';

interface BitkubTicker {
  id: number;
  last: number;
  lowestAsk: number;
  highestBid: number;
  percentChange: number;
  baseVolume: number;
  quoteVolume: number;
  isFrozen: number;
  high24hr: number;
  low24hr: number;
  change: number;
  prevClose: number;
  prevOpen: number;
}

interface BitkubTickerResponse {
  [key: string]: BitkubTicker;
}

interface BitkubSymbol {
  id: number;
  symbol: string;
  info: string;
}

interface BitkubSymbolsResponse {
  error: number;
  result: BitkubSymbol[];
}

export async function POST() {
  try {
    console.log('Fetching crypto symbols from Bitkub...');
    
    // First, fetch symbol names
    const symbolsResponse = await fetch(BITKUB_SYMBOLS_URL);
    if (!symbolsResponse.ok) {
      throw new Error(`Failed to fetch symbols: ${symbolsResponse.statusText}`);
    }
    const symbolsData: BitkubSymbolsResponse = await symbolsResponse.json();
    
    // Create a map of symbol -> name
    const symbolNames = new Map<string, string>();
    symbolsData.result.forEach(item => {
      symbolNames.set(item.symbol, item.info);
    });

    console.log('Fetching crypto prices from Bitkub...');
    
    // Then fetch prices
    const pricesResponse = await fetch(BITKUB_TICKER_URL);
    
    if (!pricesResponse.ok) {
      throw new Error(`Failed to fetch prices: ${pricesResponse.statusText}`);
    }

    const pricesData: BitkubTickerResponse = await pricesResponse.json();
    
    let insertedCount = 0;
    let errorCount = 0;
    const errors: Array<{ symbol: string; error: string }> = [];

    // Process each crypto pair
    for (const [symbol, ticker] of Object.entries(pricesData)) {
      try {
        // Extract base symbol (e.g., "BTC" from "THB_BTC")
        const baseSymbol = symbol.replace('THB_', '');
        const cryptoName = symbolNames.get(symbol) || baseSymbol;

        await db.insert(cryptos)
          .values({
            symbol: symbol,
            baseSymbol: baseSymbol,
            name: cryptoName,
            id: String(ticker.id),
            last: ticker.last,
            lowestAsk: ticker.lowestAsk,
            highestBid: ticker.highestBid,
            percentChange: ticker.percentChange,
            baseVolume: ticker.baseVolume,
            quoteVolume: ticker.quoteVolume,
            high24hr: ticker.high24hr,
            low24hr: ticker.low24hr,
            change: ticker.change,
            isFrozen: String(ticker.isFrozen),
            lastUpdated: new Date(),
          })
          .onConflictDoUpdate({
            target: cryptos.symbol,
            set: {
              name: cryptoName,
              last: ticker.last,
              lowestAsk: ticker.lowestAsk,
              highestBid: ticker.highestBid,
              percentChange: ticker.percentChange,
              baseVolume: ticker.baseVolume,
              quoteVolume: ticker.quoteVolume,
              high24hr: ticker.high24hr,
              low24hr: ticker.low24hr,
              change: ticker.change,
              isFrozen: String(ticker.isFrozen),
              lastUpdated: new Date(),
              updatedAt: new Date(),
            },
          });

        insertedCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error syncing ${symbol}:`, errorMessage);
        errors.push({
          symbol: symbol,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Crypto prices synced successfully',
      stats: {
        total: Object.keys(pricesData).length,
        inserted: insertedCount,
        errors: errorCount,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('Error syncing crypto prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all crypto prices
export async function GET() {
  try {
    const allCryptos = await db.query.cryptos.findMany({
      orderBy: (cryptos, { desc }) => [desc(cryptos.quoteVolume)],
    });

    return NextResponse.json({
      success: true,
      data: allCryptos,
      count: allCryptos.length,
    });
  } catch (error) {
    console.error('Error fetching cryptos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
