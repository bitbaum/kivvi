import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { ProfileForm } from './profile-form';

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) redirect('/settings');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings.
        </p>
      </div>

      <ProfileForm
        initialData={{
          name: user.name || '',
          email: user.email,
        }}
      />
    </div>
  );
}
