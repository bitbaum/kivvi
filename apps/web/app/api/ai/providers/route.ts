import { auth } from '@/lib/auth';
import { getProviderAvailability } from '@kivvi/ai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = getProviderAvailability({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      XAI_API_KEY: process.env.XAI_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    });

    return NextResponse.json({ providers });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
