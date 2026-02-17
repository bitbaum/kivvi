import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import { processRecurringInvoices, type GeneratedInvoiceInfo } from '@kivvi/core';
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
} from '@kivvi/core/src/domain/email';
import { getTransporter, getFromEmail } from '@/lib/email/transporter';
import { isEmailConfigured } from '@/lib/config/email';

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

    // Process recurring invoices with email callback
    const result = await processRecurringInvoices(db, {
      onInvoiceGenerated: isEmailConfigured()
        ? async (invoice: GeneratedInvoiceInfo, emailRecipients: string[]) => {
            const transporter = getTransporter();

            // Fetch company name and plan for email template
            const [company] = await db
              .select({ name: companies.name, settings: companies.settings })
              .from(companies)
              .where(eq(companies.id, invoice.companyId));

            const companyName = company?.name || 'Kivvi';
            const plan = company?.settings?.plan || 'free';

            for (const recipient of emailRecipients) {
              try {
                const emailData = {
                  recipientEmail: recipient,
                  recipientName: invoice.contact?.name || 'Kunde',
                  companyName,
                  documentNumber: invoice.number,
                  documentType: invoice.type,
                  total: invoice.total,
                  currency: invoice.currency,
                  dueDate: invoice.dueDate || undefined,
                  plan: plan as 'free' | 'premium',
                };

                await transporter.sendMail({
                  from: `${companyName} <${getFromEmail()}>`,
                  to: recipient,
                  subject: buildInvoiceEmailSubject(emailData),
                  html: buildInvoiceEmailHtml(emailData),
                });
              } catch (emailError) {
                console.error(`Failed to send recurring invoice email to ${recipient}:`, emailError);
              }
            }
          }
        : undefined,
    });

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
