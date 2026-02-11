import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, User, Hash, ArrowRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies, users } from '@kivvi/database';
import { eq } from 'drizzle-orm';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  const sections = [
    {
      title: 'Company Settings',
      subtitle: company?.name || 'Configure your company',
      href: '/settings/company',
      icon: Building2,
    },
    {
      title: 'User Profile',
      subtitle: user?.email || 'Manage your account',
      href: '/settings/profile',
      icon: User,
    },
    {
      title: 'Number Sequences',
      subtitle: 'Document numbering formats',
      href: '/settings/sequences',
      icon: Hash,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your company, profile, and system settings.
        </p>
      </div>

      {/* Section cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg border bg-background p-3">
                <section.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
