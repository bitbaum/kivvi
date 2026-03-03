import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllModels } from '@kivvi/ai';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const models = getAllModels();
    return NextResponse.json({ models });
  } catch (error) {
    logger.error('Failed to get models', error);
    return NextResponse.json(
      { error: 'Failed to get models' },
      { status: 500 }
    );
  }
}
