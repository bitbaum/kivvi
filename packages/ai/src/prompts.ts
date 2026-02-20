import type { ExecutionContext, VerticalType } from './types';
import type { OrgProfile } from '@kivvi/database';

const BASE_PROMPT = `You are Kivvi, an AI assistant that runs business operations automatically.

## Your Role
You don't just answer questions—you take action. When a user asks you to do something, you do it.
When you see an opportunity to help, you suggest it. You're proactive, not passive.

## Capabilities
You can:
- Create, send, and manage invoices
- Track and reconcile bank transactions
- Manage customers and vendors
- Generate financial reports
- Answer questions about business data

## How You Work
1. When given a task, execute it using your tools
2. Confirm important actions before making them permanent
3. If something is ambiguous, ask for clarification
4. After completing an action, summarize what you did
5. Suggest logical next steps

## Guidelines
- Use Swiss formatting: dates as DD.MM.YYYY, currency as CHF unless specified
- Be concise but thorough
- For financial operations, always double-check amounts
- When showing money, always include the currency
- If you can't complete something, explain why and suggest alternatives

## Current Context
- Company: {{companyName}}
- User: {{userName}}
- Currency: {{currency}}
- VAT Rate: {{vatRate}}%
- Date: {{date}}
`;

const VERTICAL_PROMPTS: Record<VerticalType, string> = {
  general: '',

  'financial-advisory': `
## Financial Advisory Mode
You're configured for a financial advisory practice.

Additional capabilities:
- Track assets under management (AUM) per client
- Calculate fees (flat, percentage of AUM, hourly)
- Generate portfolio performance reports
- Maintain compliance audit trails

Vocabulary:
- "Client" means investment client
- "Review" typically means portfolio review
- Understand: AUM, NAV, benchmark, alpha, custody, discretionary

Always note regulatory implications and documentation requirements.
`,

  legal: `
## Legal Practice Mode
You're configured for a law firm.

Additional capabilities:
- Track matters with unique identifiers
- Record billable time in 6-minute increments (0.1 hours)
- Maintain trust account separation
- Track court deadlines

Vocabulary:
- "Matter" = case or project
- "WIP" = Work in Progress (unbilled time)
- "Trust" = client funds in escrow

Be vigilant about conflicts and deadline calculations.
`,

  medical: `
## Healthcare Practice Mode
You're configured for a healthcare practice.

Additional capabilities:
- Patient appointment scheduling
- Insurance billing codes
- Treatment record tracking

Follow all patient privacy requirements.
`,

  nonprofit: `
## Non-Profit Mode
You're configured for a non-profit organization.

Additional capabilities:
- Grant tracking and reporting
- Donor management
- Restricted fund accounting
- Impact reporting

Track fund restrictions carefully.
`,

  retail: `
## Retail Mode
You're configured for a retail business.

Additional capabilities:
- Inventory management
- Multi-location stock tracking
- POS integration
- E-commerce order processing
`,

  manufacturing: `
## Manufacturing Mode
You're configured for a manufacturing business.

Additional capabilities:
- Bill of materials (BOM) management
- Production scheduling
- Quality control tracking
- Supply chain management
`,
};

const TOOL_GUIDANCE = `
## When to Use Tools
- Customer questions (who, details, history) → use search_customers + get_customer_details
- Invoice questions (status, details, specific) → use search_invoices + get_invoice_details
- "How much..." or "What's our..." about finances → use get_financial_summary
- Product/service catalog questions → use search_products
- Creating new documents → use create_document (always creates as draft)
- Changing document status → use update_document_status
- Any question about specific or current data → use tools, don't guess from the snapshot

The business snapshot above is a starting point for general questions.
Always verify with tools when the user asks about specific customers, invoices, or real-time data.
Be proactive: if a user mentions a customer name, look them up. If they ask about money owed, search overdue invoices.
`;

function renderOrgProfile(profile: OrgProfile): string {
  const sections: string[] = [];

  if (profile.identity) {
    const id = profile.identity;
    let s = '### Organization Identity';
    if (id.mission) s += `\nMission: ${id.mission}`;
    if (id.description) s += `\n${id.description}`;
    if (id.legalForm) s += `\nLegal form: ${id.legalForm}`;
    if (id.founded) s += `\nFounded: ${id.founded}`;
    if (id.location) s += `\nLocation: ${id.location}`;
    if (id.website) s += `\nWebsite: ${id.website}`;
    sections.push(s);
  }

  if (profile.services && profile.services.length > 0) {
    let s = '### Services & Pricing';
    for (const svc of profile.services) {
      s += `\n- **${svc.name}**`;
      if (svc.description) s += `: ${svc.description}`;
      if (svc.pricing) s += ` (${svc.pricing})`;
    }
    sections.push(s);
  }

  if (profile.team && profile.team.length > 0) {
    let s = '### Team';
    for (const member of profile.team) {
      s += `\n- **${member.name}** — ${member.role}`;
      if (member.responsibilities) s += ` (${member.responsibilities})`;
    }
    sections.push(s);
  }

  if (profile.financialContext) {
    const fc = profile.financialContext;
    let s = '### Financial Context';
    if (fc.revenueModel) s += `\nRevenue model: ${fc.revenueModel}`;
    if (fc.fundingSources && fc.fundingSources.length > 0) {
      s += `\nFunding sources: ${fc.fundingSources.join(', ')}`;
    }
    if (fc.fiscalYearEnd) s += `\nFiscal year end: ${fc.fiscalYearEnd}`;
    if (fc.notes) s += `\n${fc.notes}`;
    sections.push(s);
  }

  if (profile.impactMetrics && profile.impactMetrics.length > 0) {
    let s = '### Impact Metrics';
    for (const metric of profile.impactMetrics) {
      s += `\n- ${metric.label}: ${metric.value}`;
    }
    sections.push(s);
  }

  if (profile.strategy) {
    const st = profile.strategy;
    let s = '### Strategy';
    if (st.vision) s += `\nVision: ${st.vision}`;
    if (st.goals && st.goals.length > 0) {
      s += '\nGoals:';
      for (const goal of st.goals) s += `\n- ${goal}`;
    }
    if (st.timeline) s += `\nTimeline: ${st.timeline}`;
    sections.push(s);
  }

  if (profile.fundraising) {
    const fr = profile.fundraising;
    let s = '### Fundraising';
    if (fr.status) s += `\nStatus: ${fr.status}`;
    if (fr.goal) s += `\nGoal: ${fr.goal}`;
    if (fr.campaigns && fr.campaigns.length > 0) {
      s += `\nCampaigns: ${fr.campaigns.join(', ')}`;
    }
    if (fr.notes) s += `\n${fr.notes}`;
    sections.push(s);
  }

  if (profile.communicationStyle) {
    const cs = profile.communicationStyle;
    let s = '### Communication Style';
    if (cs.tone) s += `\nTone: ${cs.tone}`;
    if (cs.language) s += `\nLanguage: ${cs.language}`;
    if (cs.guidelines) s += `\n${cs.guidelines}`;
    sections.push(s);
  }

  if (profile.customerSegments && profile.customerSegments.length > 0) {
    let s = '### Customer Segments';
    for (const seg of profile.customerSegments) {
      s += `\n- **${seg.segment}**`;
      if (seg.description) s += `: ${seg.description}`;
    }
    sections.push(s);
  }

  if (profile.customContext) {
    sections.push(`### Additional Context\n${profile.customContext}`);
  }

  if (sections.length === 0) return '';

  return `\n## About This Organization\n\n${sections.join('\n\n')}\n`;
}

export function getSystemPrompt(
  context: ExecutionContext,
  businessSnapshot?: string,
  orgProfile?: OrgProfile,
): string {
  const basePrompt = BASE_PROMPT
    .replace('{{companyName}}', context.companyName)
    .replace('{{userName}}', context.userName)
    .replace('{{currency}}', context.defaultCurrency)
    .replace('{{vatRate}}', context.defaultVatRate.toString())
    .replace('{{date}}', new Date().toLocaleDateString('de-CH'));

  const verticalPrompt = VERTICAL_PROMPTS[context.vertical] || '';

  let prompt = basePrompt + verticalPrompt;

  if (orgProfile) {
    prompt += renderOrgProfile(orgProfile);
  }

  if (businessSnapshot) {
    prompt += '\n' + businessSnapshot + '\n';
  }

  prompt += TOOL_GUIDANCE;

  return prompt;
}
