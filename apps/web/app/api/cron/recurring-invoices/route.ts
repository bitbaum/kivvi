import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processRecurringInvoices } from '@kivvi/core';

/**
 * Cron endpoint for processing recurring invoices.
 * Called daily by Vercel Cron.
 *
 * Protected by CRON_SECRET environment variable.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel automatically adds this header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process recurring invoices
    const result = await processRecurringInvoices(db);

    console.log('Recurring invoices processed:', result);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      generated: result.generated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error processing recurring invoices:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
