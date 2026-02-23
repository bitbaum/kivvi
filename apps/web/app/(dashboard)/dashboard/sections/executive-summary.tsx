import { getExecutiveSummary } from '@kivvi/core/src/domain/dashboard';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { formatCurrency } from '@/lib/utils';

export async function ExecutiveSummary() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const companyId = session.user.companyId;
  const t = await getTranslations('dashboard');

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('greeting.morning')
      : hour < 18
        ? t('greeting.afternoon')
        : t('greeting.evening');

  let summary;
  try {
    summary = await getExecutiveSummary(db, companyId);
  } catch {
    // Fallback to simple greeting if summary fails
    return (
      <div id="main-content">
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground">{t('hereIsOverview')}</p>
      </div>
    );
  }

  // Build narrative from highlights
  const renderHighlight = (highlight: typeof summary.highlights[0]) => {
    const { key, params } = highlight;
    // Format currency params for display
    const formattedParams: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === 'amount') {
        formattedParams[k] = formatCurrency(v as number);
      } else {
        formattedParams[k] = v;
      }
    }
    return t(key, formattedParams);
  };

  return (
    <div id="main-content" className="space-y-2">
      <h1 className="text-3xl font-bold">{greeting}</h1>
      {summary.highlights.length > 0 ? (
        <p className="text-muted-foreground leading-relaxed">
          {summary.highlights.map((h, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {renderHighlight(h)}
            </span>
          ))}
        </p>
      ) : (
        <p className="text-muted-foreground">{t('hereIsOverview')}</p>
      )}
    </div>
  );
}
