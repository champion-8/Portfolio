import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stocks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface StockPriceData {
  symbol: string;
  price: number;
  priceDate: Date;
  currency?: string;
  previousClose?: number;
  change?: number;
  changePercent?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'symbol is required' },
        { status: 400 }
      );
    }

    // Yahoo Finance uses .BK suffix for Thai stocks
    const yahooSymbol = `${symbol}.BK`;

    console.log(`Fetching price for ${yahooSymbol}...`);

    // Fetch quote from Yahoo Finance
    const quote = await yahooFinance.quote(yahooSymbol) as {
      regularMarketPrice?: number;
      regularMarketTime?: Date;
      currency?: string;
      regularMarketPreviousClose?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
    };

    if (!quote || !quote.regularMarketPrice) {
      return NextResponse.json(
        {
          success: false,
          error: `No price data found for ${symbol}`,
        },
        { status: 404 }
      );
    }

    const priceData: StockPriceData = {
      symbol: symbol,
      price: quote.regularMarketPrice,
      priceDate: quote.regularMarketTime || new Date(),
      currency: quote.currency,
      previousClose: quote.regularMarketPreviousClose,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
    };

    // Update stock in database
    await db.update(stocks)
      .set({
        latestPrice: priceData.price,
        latestPriceDate: priceData.priceDate,
        updatedAt: new Date(),
      })
      .where(eq(stocks.symbol, symbol));

    return NextResponse.json({
      success: true,
      message: 'Stock price updated successfully',
      data: priceData,
    });
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve stock price from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'symbol is required' },
        { status: 400 }
      );
    }

    const stock = await db.query.stocks.findFirst({
      where: eq(stocks.symbol, symbol),
    });

    if (!stock) {
      return NextResponse.json(
        { success: false, error: 'Stock not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        symbol: stock.symbol,
        nameTh: stock.nameTh,
        latestPrice: stock.latestPrice,
        latestPriceDate: stock.latestPriceDate,
      },
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
