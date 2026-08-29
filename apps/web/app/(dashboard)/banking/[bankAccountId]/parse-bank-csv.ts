export interface ParsedTransaction {
  date: string;
  description: string;
  reference: string;
  amount: string;
  balance: string;
}

export function parseCsv(text: string): ParsedTransaction[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  const dateIdx = header.findIndex((h) => h === "date" || h === "datum");
  const descIdx = header.findIndex(
    (h) => h === "description" || h === "beschreibung" || h === "text",
  );
  const refIdx = header.findIndex((h) => h === "reference" || h === "referenz" || h === "ref");
  const amountIdx = header.findIndex((h) => h === "amount" || h === "betrag");
  const balanceIdx = header.findIndex((h) => h === "balance" || h === "saldo");

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error('CSV must contain at least "date" and "amount" columns');
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const date = cols[dateIdx]?.trim();
    const amount = cols[amountIdx]?.trim().replace(/['\s]/g, "");

    if (!date || !amount) continue;

    transactions.push({
      date,
      description: descIdx >= 0 ? cols[descIdx]?.trim() || "" : "",
      reference: refIdx >= 0 ? cols[refIdx]?.trim() || "" : "",
      amount,
      balance: balanceIdx >= 0 ? cols[balanceIdx]?.trim().replace(/['\s]/g, "") || "" : "",
    });
  }

  return transactions;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === ";") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
