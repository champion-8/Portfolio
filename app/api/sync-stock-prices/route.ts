import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stocks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface StockPriceUpdate {
  symbol: string;
  price: number | null;
  priceDate: Date | null;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit } = body;

    // Get all stocks from database
    console.log('Fetching all stocks from database...');
    const allStocks = await db.query.stocks.findMany({
      limit: limit || undefined,
    });

    console.log(`Found ${allStocks.length} stocks`);

    let successCount = 0;
    let failCount = 0;
    const updates: StockPriceUpdate[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    // Fetch price for each stock
    for (const stock of allStocks) {
      try {
        // Yahoo Finance uses .BK suffix for Thai stocks
        const yahooSymbol = `${stock.symbol}.BK`;
        
        console.log(`Fetching price for ${yahooSymbol}...`);

        // Fetch quote from Yahoo Finance
        const quote = await yahooFinance.quote(yahooSymbol) as {
          regularMarketPrice?: number;
          regularMarketTime?: Date;
        };

        if (!quote || !quote.regularMarketPrice) {
          failCount++;
          errors.push({
            symbol: stock.symbol,
            error: 'No price data available',
          });
          updates.push({
            symbol: stock.symbol,
            price: null,
            priceDate: null,
            error: 'No price data',
          });
          continue;
        }

        const price = quote.regularMarketPrice;
        const priceDate = quote.regularMarketTime || new Date();

        // Update stock in database
        await db.update(stocks)
          .set({
            latestPrice: price,
            latestPriceDate: priceDate,
            updatedAt: new Date(),
          })
          .where(eq(stocks.symbol, stock.symbol));

        successCount++;
        updates.push({
          symbol: stock.symbol,
          price: price,
          priceDate: priceDate,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching price for ${stock.symbol}:`, errorMessage);
        errors.push({
          symbol: stock.symbol,
          error: errorMessage,
        });
        updates.push({
          symbol: stock.symbol,
          price: null,
          priceDate: null,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stock prices sync completed',
      stats: {
        total: allStocks.length,
        success: successCount,
        failed: failCount,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('Error syncing stock prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
