import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPortfolio, funds, stocks, cryptos, portfolioTransactions } from '@/lib/db/schema';
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

// POST - เพิ่ม asset ใหม่ (buy) หรือบันทึกการขาย (sell)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { type = 'buy', assetType, assetId, assetName, quantity, avgBuyPrice, notes, folderId, transactionDate, portfolioId, pricePerUnit, totalAmount } = body;

    if (quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    // ---- SELL flow ----
    if (type === 'sell') {
      if (!portfolioId || !pricePerUnit) {
        return NextResponse.json({ success: false, error: 'Missing portfolioId or pricePerUnit for sell' }, { status: 400 });
      }

      // Find and verify ownership of the portfolio entry
      const [entry] = await db
        .select()
        .from(userPortfolio)
        .where(and(eq(userPortfolio.id, portfolioId), eq(userPortfolio.userId, session.userId)));

      if (!entry) {
        return NextResponse.json({ success: false, error: 'Asset not found in portfolio' }, { status: 404 });
      }

      // Precision-safe comparison: round to 8 decimals
      const availableQty = Math.round(entry.quantity * 1e8) / 1e8;
      const sellQty = Math.round(quantity * 1e8) / 1e8;

      if (sellQty > availableQty) {
        return NextResponse.json(
          { success: false, error: `ขายได้สูงสุด ${availableQty.toLocaleString(undefined, { maximumFractionDigits: 5 })} หน่วย` },
          { status: 400 }
        );
      }

      const sellTotal = totalAmount ?? quantity * pricePerUnit;

      if (sellQty >= availableQty) {
        // Selling all units → remove portfolio entry
        await db.delete(userPortfolio).where(eq(userPortfolio.id, portfolioId));
      } else {
        // Partial sell → reduce quantity, keep same avgBuyPrice
        const newQty = availableQty - sellQty;
        const newTotalCost = newQty * entry.avgBuyPrice;
        await db.update(userPortfolio).set({
          quantity: newQty,
          totalCost: newTotalCost,
          updatedAt: new Date(),
        }).where(eq(userPortfolio.id, portfolioId));
      }

      // Record sell transaction
      const txnId = `txn_${session.userId}_${Date.now()}`;
      await db.insert(portfolioTransactions).values({
        id: txnId,
        userId: session.userId,
        portfolioId,
        assetType: entry.assetType,
        assetId: entry.assetId,
        assetName: entry.assetName,
        type: 'sell',
        quantity,
        pricePerUnit,
        totalAmount: sellTotal,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        notes: notes || null,
      });

      return NextResponse.json({ success: true, message: 'บันทึกการขายสำเร็จ' });
    }

    // ---- BUY flow ----
    if (!assetType || !assetId || !assetName || !quantity || !avgBuyPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (avgBuyPrice <= 0) {
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
      folderId: folderId || null,
    });

    // Auto-record the initial buy transaction
    const txnId = `txn_${session.userId}_${Date.now()}`;
    await db.insert(portfolioTransactions).values({
      id: txnId,
      userId: session.userId,
      portfolioId: id,
      assetType,
      assetId,
      assetName,
      type: 'buy',
      quantity,
      pricePerUnit: avgBuyPrice,
      totalAmount: totalCost,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
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
    const { id, quantity, avgBuyPrice, notes, folderId } = body;

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
        folderId: folderId !== undefined ? (folderId || null) : undefined,
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
