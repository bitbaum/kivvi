import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import { processOverdueInvoices, type DunningInfo } from '@kivvi/core';
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
} from '@kivvi/core/src/domain/email';
import { getTransporter, getFromEmail } from '@/lib/email/transporter';
import { isEmailConfigured } from '@/lib/config/email';
import { logger } from '@/lib/logger';

/**
 * Cron endpoint for automated dunning processing.
 * Called daily by Vercel Cron. Detects overdue invoices and auto-escalates
 * dunning levels based on time thresholds (14/30/60 days).
 *
 * Protected by CRON_SECRET environment variable.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await processOverdueInvoices(db, {
      onDunningCreated: isEmailConfigured()
        ? async (info: DunningInfo, emailRecipients: string[]) => {
            const transporter = getTransporter();

            const [company] = await db
              .select({ name: companies.name, settings: companies.settings })
              .from(companies)
              .where(eq(companies.id, info.companyId));

            const companyName = company?.name || 'Kivvi';
            const plan = company?.settings?.plan || 'free';

            for (const recipient of emailRecipients) {
              try {
                const emailData = {
                  recipientEmail: recipient,
                  recipientName: info.contactName || 'Kunde',
                  companyName,
                  documentNumber: info.dunningNumber,
                  documentType: 'dunning',
                  total: info.total,
                  currency: info.currency,
                  dueDate: info.dueDate || undefined,
                  plan: plan as 'free' | 'premium',
                };

                await transporter.sendMail({
                  from: `${companyName} <${getFromEmail()}>`,
                  to: recipient,
                  subject: buildInvoiceEmailSubject(emailData),
                  html: buildInvoiceEmailHtml(emailData),
                });
              } catch (emailError) {
                logger.error(`Failed to send dunning email to ${recipient}`, emailError);
              }
            }
          }
        : undefined,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      created: result.created,
      errors: result.errors,
    });
  } catch (error) {
    logger.error('Error processing automated dunning', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
