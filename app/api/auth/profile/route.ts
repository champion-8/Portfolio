import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth, getUserById } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const user = await getUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { email, fullName } = body;

    const updates: { email?: string; fullName?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (email !== undefined) {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
      updates.email = email;
    }

    if (fullName !== undefined) {
      updates.fullName = fullName || null;
    }

    // Update user
    const updatedUsers = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.userId))
      .returning();

    const updatedUser = updatedUsers[0];

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        fullName: updatedUser.fullName,
      },
    });
  } catch (error: unknown) {
    console.error('Profile update error:', error);

    if (error && typeof error === 'object' && 'message' in error) {
      if ((error.message as string) === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401 }
        );
      }
    }

    // Check for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
