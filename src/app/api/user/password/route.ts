import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getApiSession, unauthorizedResponse } from '@/lib/api-auth';
import { z } from 'zod';

// Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// POST - Change password (credentials auth only)
export async function POST(request: Request) {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    // Check if user has a password (credentials auth)
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'Password change is not available for OAuth accounts. You signed in with Google, Apple, or a passkey.' },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check new password is different
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash and save new password (14 rounds to match registration)
    const newHash = await bcrypt.hash(newPassword, 14);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
