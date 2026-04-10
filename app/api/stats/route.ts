import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { funds, stocks, cryptos } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get counts from each table
    const [fundsCount] = await db.select({ count: sql<number>`count(*)` }).from(funds);
    const [stocksCount] = await db.select({ count: sql<number>`count(*)` }).from(stocks);
    const [cryptosCount] = await db.select({ count: sql<number>`count(*)` }).from(cryptos);

    return NextResponse.json({
      success: true,
      stats: {
        totalFunds: Number(fundsCount?.count || 0),
        totalStocks: Number(stocksCount?.count || 0),
        totalCryptos: Number(cryptosCount?.count || 0),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
