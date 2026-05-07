import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { portfolioTransactions, userPortfolio } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET - ดึง transactions ของ asset หนึ่งตัว (?portfolioId=...) หรือทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    let transactions;
    if (portfolioId) {
      transactions = await db
        .select()
        .from(portfolioTransactions)
        .where(
          and(
            eq(portfolioTransactions.userId, session.userId),
            eq(portfolioTransactions.portfolioId, portfolioId),
          )
        )
        .orderBy(desc(portfolioTransactions.transactionDate));
    } else {
      transactions = await db
        .select()
        .from(portfolioTransactions)
        .where(eq(portfolioTransactions.userId, session.userId))
        .orderBy(desc(portfolioTransactions.transactionDate));
    }

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST - บันทึก transaction ใหม่ (ซื้อ/ขาย)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      portfolioId,
      assetType,
      assetId,
      assetName,
      type = 'buy',
      quantity,
      pricePerUnit,
      totalAmount,
      transactionDate,
      notes,
    } = body;

    if (!assetType || !assetId || !assetName || !quantity || !pricePerUnit || !transactionDate) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (quantity <= 0 || pricePerUnit <= 0) {
      return NextResponse.json({ success: false, error: 'Quantity and price must be greater than 0' }, { status: 400 });
    }

    const id = `txn_${session.userId}_${Date.now()}`;
    const computedTotal = totalAmount ?? quantity * pricePerUnit;

    await db.insert(portfolioTransactions).values({
      id,
      userId: session.userId,
      portfolioId: portfolioId || null,
      assetType,
      assetId,
      assetName,
      type,
      quantity,
      pricePerUnit,
      totalAmount: computedTotal,
      transactionDate: new Date(transactionDate),
      notes: notes || null,
    });

    return NextResponse.json({ success: true, message: 'Transaction recorded', id });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record transaction' }, { status: 500 });
  }
}

// DELETE - ลบ transaction
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
    }

    await db
      .delete(portfolioTransactions)
      .where(
        and(
          eq(portfolioTransactions.id, id),
          eq(portfolioTransactions.userId, session.userId),
        )
      );

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete transaction' }, { status: 500 });
  }
}
