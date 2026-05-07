import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { portfolioFolders, userPortfolio } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET - ดึงโฟลเดอร์ทั้งหมดของ user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const folders = await db
      .select()
      .from(portfolioFolders)
      .where(eq(portfolioFolders.userId, session.userId))
      .orderBy(portfolioFolders.sortOrder, portfolioFolders.createdAt);

    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// POST - สร้างโฟลเดอร์ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ success: false, error: 'Folder name too long' }, { status: 400 });
    }

    const id = `folder_${session.userId}_${Date.now()}`;

    // Get current max sort order
    const existing = await db
      .select()
      .from(portfolioFolders)
      .where(eq(portfolioFolders.userId, session.userId));
    const sortOrder = existing.length;

    await db.insert(portfolioFolders).values({
      id,
      userId: session.userId,
      name: name.trim(),
      color: color || 'purple',
      sortOrder,
    });

    return NextResponse.json({ success: true, message: 'Folder created', id });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create folder' }, { status: 500 });
  }
}

// PUT - แก้ไขชื่อ/สี โฟลเดอร์
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, color } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Folder ID required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ success: false, error: 'Folder name too long' }, { status: 400 });
    }

    await db
      .update(portfolioFolders)
      .set({ name: name.trim(), color: color || 'purple', updatedAt: new Date() })
      .where(and(eq(portfolioFolders.id, id), eq(portfolioFolders.userId, session.userId)));

    return NextResponse.json({ success: true, message: 'Folder updated' });
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update folder' }, { status: 500 });
  }
}

// DELETE - ลบโฟลเดอร์ (assets ใน folder จะถูก unassign ออกมา)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');

    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Folder ID required' }, { status: 400 });
    }

    // Unassign assets from this folder
    await db
      .update(userPortfolio)
      .set({ folderId: null })
      .where(
        and(
          eq(userPortfolio.folderId, folderId),
          eq(userPortfolio.userId, session.userId),
        )
      );

    // Delete the folder
    await db
      .delete(portfolioFolders)
      .where(and(eq(portfolioFolders.id, folderId), eq(portfolioFolders.userId, session.userId)));

    return NextResponse.json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete folder' }, { status: 500 });
  }
}
