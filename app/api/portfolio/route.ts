import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPortfolio, funds, stocks, cryptos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET - ดึงข้อมูล portfolio ของ user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's portfolio
    const portfolio = await db
      .select()
      .from(userPortfolio)
      .where(eq(userPortfolio.userId, session.userId));

    // Get current prices for each asset
    const enrichedPortfolio = await Promise.all(
      portfolio.map(async (item) => {
        let currentPrice = 0;
        let assetDetails: any = null;

        if (item.assetType === 'fund') {
          const fund = await db
            .select()
            .from(funds)
            .where(eq(funds.projId, item.assetId))
            .limit(1);
          
          if (fund[0]) {
            currentPrice = fund[0].latestNavValue || 0;
            assetDetails = fund[0];
          }
        } else if (item.assetType === 'stock') {
          const stock = await db
            .select()
            .from(stocks)
            .where(eq(stocks.symbol, item.assetId))
            .limit(1);
          
          if (stock[0]) {
            currentPrice = stock[0].latestPrice || 0;
            assetDetails = stock[0];
          }
        } else if (item.assetType === 'crypto') {
          const crypto = await db
            .select()
            .from(cryptos)
            .where(eq(cryptos.symbol, item.assetId))
            .limit(1);
          
          if (crypto[0]) {
            currentPrice = crypto[0].last || 0;
            assetDetails = crypto[0];
          }
        }

        const currentValue = item.quantity * currentPrice;
        const profit = currentValue - item.totalCost;
        const profitPercent = item.totalCost > 0 ? (profit / item.totalCost) * 100 : 0;

        return {
          ...item,
          currentPrice,
          currentValue,
          profit,
          profitPercent,
          assetDetails,
        };
      })
    );

    // Calculate summary
    const summary = {
      totalCost: enrichedPortfolio.reduce((sum, item) => sum + item.totalCost, 0),
      totalValue: enrichedPortfolio.reduce((sum, item) => sum + item.currentValue, 0),
      totalProfit: enrichedPortfolio.reduce((sum, item) => sum + item.profit, 0),
      totalProfitPercent: 0,
    };

    summary.totalProfitPercent = summary.totalCost > 0 
      ? (summary.totalProfit / summary.totalCost) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      portfolio: enrichedPortfolio,
      summary,
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// POST - เพิ่ม asset ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { assetType, assetId, assetName, quantity, avgBuyPrice, notes } = body;

    // Validate input
    if (!assetType || !assetId || !assetName || !quantity || !avgBuyPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || avgBuyPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity and price must be greater than 0' },
        { status: 400 }
      );
    }

    const totalCost = quantity * avgBuyPrice;
    const id = `${session.userId}_${assetType}_${assetId}_${Date.now()}`;

    // Insert into database
    await db.insert(userPortfolio).values({
      id,
      userId: session.userId,
      assetType,
      assetId,
      assetName,
      quantity,
      avgBuyPrice,
      totalCost,
      notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Asset added to portfolio successfully',
    });
  } catch (error) {
    console.error('Add portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add asset' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ asset
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('id');

    if (!portfolioId) {
      return NextResponse.json(
        { success: false, error: 'Portfolio ID required' },
        { status: 400 }
      );
    }

    // Delete only if belongs to user
    await db
      .delete(userPortfolio)
      .where(
        and(
          eq(userPortfolio.id, portfolioId),
          eq(userPortfolio.userId, session.userId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Asset removed from portfolio',
    });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไข asset
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, quantity, avgBuyPrice, notes } = body;

    // Validate input
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Portfolio ID required' },
        { status: 400 }
      );
    }

    if (!quantity || !avgBuyPrice) {
      return NextResponse.json(
        { success: false, error: 'Quantity and avgBuyPrice are required' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || avgBuyPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity and price must be greater than 0' },
        { status: 400 }
      );
    }

    const totalCost = quantity * avgBuyPrice;

    // Update portfolio item (only if belongs to user)
    const result = await db
      .update(userPortfolio)
      .set({
        quantity,
        avgBuyPrice,
        totalCost,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userPortfolio.id, id),
          eq(userPortfolio.userId, session.userId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Asset updated successfully',
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}
