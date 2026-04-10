import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { funds, stocks, cryptos } from '@/lib/db/schema';
import { ilike, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET - ค้นหา assets (funds, stocks, cryptos)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const assetType = searchParams.get('type') || 'all'; // 'fund', 'stock', 'crypto', 'all'

    const results: any = {
      funds: [],
      stocks: [],
      cryptos: [],
    };

    if ((assetType === 'fund' || assetType === 'all') && query.length >= 2) {
      results.funds = await db
        .select({
          id: funds.projId,
          name: funds.projNameTh,
          abbr: funds.projAbbrName,
          type: funds.fundStatus,
          price: funds.latestNavValue,
        })
        .from(funds)
        .where(
          or(
            ilike(funds.projNameTh, `%${query}%`),
            ilike(funds.projAbbrName, `%${query}%`)
          )
        )
        .limit(20);
    }

    if ((assetType === 'stock' || assetType === 'all') && query.length >= 1) {
      results.stocks = await db
        .select({
          id: stocks.symbol,
          name: stocks.nameTh,
          symbol: stocks.symbol,
          market: stocks.market,
          price: stocks.latestPrice,
        })
        .from(stocks)
        .where(
          or(
            ilike(stocks.symbol, `%${query}%`),
            ilike(stocks.nameTh, `%${query}%`)
          )
        )
        .limit(20);
    }

    if ((assetType === 'crypto' || assetType === 'all') && query.length >= 1) {
      results.cryptos = await db
        .select({
          id: cryptos.symbol,
          name: cryptos.name,
          symbol: cryptos.baseSymbol,
          price: cryptos.last,
        })
        .from(cryptos)
        .where(
          or(
            ilike(cryptos.baseSymbol, `%${query}%`),
            ilike(cryptos.name, `%${query}%`)
          )
        )
        .limit(20);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Search assets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search assets' },
      { status: 500 }
    );
  }
}
