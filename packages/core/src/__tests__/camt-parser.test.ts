import { describe, it, expect } from 'vitest';
import { parseCamtXml, normalizeIban } from '../domain/camt-parser';

// ============================================================================
// XML FIXTURES
// ============================================================================

const CAMT053_MINIMAL = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <Stmt>
      <Acct>
        <Id><IBAN>CH93 0076 2011 6238 5295 7</IBAN></Id>
        <Ccy>CHF</Ccy>
      </Acct>
      <Bal>
        <Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="CHF">10000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-03-01</Dt></Dt>
      </Bal>
      <Bal>
        <Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="CHF">12500.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-03-01</Dt></Dt>
      </Bal>
      <Ntry>
        <AcctSvcrRef>REF-001</AcctSvcrRef>
        <Amt Ccy="CHF">2500.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-01</Dt></BookgDt>
        <ValDt><Dt>2026-03-01</Dt></ValDt>
        <NtryDtls>
          <TxDtls>
            <RltdPties>
              <Dbtr><Nm>Max Muster AG</Nm></Dbtr>
            </RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Ref>210000000003139471430009017</Ref>
                </CdtrRefInf>
              </Strd>
              <Ustrd>Invoice payment RE-2026-00001</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_V04 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04">
  <BkToCstmrStmt>
    <Stmt>
      <Acct>
        <Id><IBAN>CH4308307000289537312</IBAN></Id>
        <Ccy>CHF</Ccy>
      </Acct>
      <Bal>
        <Tp><CdOrPrtry><Cd>PRCD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="CHF">5000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-02-28</Dt></Dt>
      </Bal>
      <Bal>
        <Tp><CdOrPrtry><Cd>CLAV</Cd></CdOrPrtry></Tp>
        <Amt Ccy="CHF">5750.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-03-01</Dt></Dt>
      </Bal>
      <Ntry>
        <AcctSvcrRef>REF-V04</AcctSvcrRef>
        <Amt Ccy="CHF">750.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-01</Dt></BookgDt>
        <ValDt><Dt>2026-03-01</Dt></ValDt>
        <AddtlNtryInf>Transfer from savings</AddtlNtryInf>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT054_NOTIFICATION = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.08">
  <BkToCstmrDbtCdtNtfctn>
    <Ntfctn>
      <Acct>
        <Id><IBAN>CH9300762011623852957</IBAN></Id>
        <Ccy>CHF</Ccy>
      </Acct>
      <Ntry>
        <AcctSvcrRef>NOTIF-001</AcctSvcrRef>
        <Amt Ccy="CHF">1200.50</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-05</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <RltdPties>
              <Dbtr><Nm>ABC GmbH</Nm></Dbtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Zahlung Rechnung 2026-001</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`;

const CAMT053_DEBIT = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <AcctSvcrRef>DEBIT-001</AcctSvcrRef>
        <Amt Ccy="CHF">350.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-02</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <RltdPties>
              <Cdtr><Nm>Swisscom AG</Nm></Cdtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Telecom bill March 2026</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_REVERSAL = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <AcctSvcrRef>REV-001</AcctSvcrRef>
        <Amt Ccy="CHF">500.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <RvslInd>true</RvslInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-03</Dt></BookgDt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_PENDING = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <Amt Ccy="CHF">100.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>PDNG</Sts>
        <BookgDt><Dt>2026-03-04</Dt></BookgDt>
      </Ntry>
      <Ntry>
        <Amt Ccy="CHF">200.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-04</Dt></BookgDt>
      </Ntry>
      <Ntry>
        <Amt Ccy="CHF">300.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>INFO</Sts>
        <BookgDt><Dt>2026-03-04</Dt></BookgDt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_ENDTOEND = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <Amt Ccy="CHF">999.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-06</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-REF-12345</EndToEndId>
            </Refs>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_ENDTOEND_NOTPROVIDED = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <Amt Ccy="CHF">100.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-06</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>NOTPROVIDED</EndToEndId>
            </Refs>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_MULTIPLE_ENTRIES = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <AcctSvcrRef>MULTI-001</AcctSvcrRef>
        <Amt Ccy="CHF">1000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-01</Dt></BookgDt>
      </Ntry>
      <Ntry>
        <AcctSvcrRef>MULTI-002</AcctSvcrRef>
        <Amt Ccy="CHF">2000.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-02</Dt></BookgDt>
      </Ntry>
      <Ntry>
        <AcctSvcrRef>MULTI-003</AcctSvcrRef>
        <Amt Ccy="CHF">500.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-03</Dt></BookgDt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_EMPTY_ENTRIES = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_SCOR_REF = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <Amt Ccy="CHF">450.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-07</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Tp><CdOrPrtry><Cd>SCOR</Cd></CdOrPrtry></Tp>
                  <Ref>RF18539007547034</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const CAMT053_MULTIPLE_TX_DTLS = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CH9300762011623852957</IBAN></Id></Acct>
      <Ntry>
        <Amt Ccy="CHF">3000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-03-08</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <RltdPties>
              <Dbtr><Nm>First Payer</Nm></Dbtr>
            </RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Ref>QR-REF-FIRST</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
          <TxDtls>
            <RltdPties>
              <Dbtr><Nm>Second Payer</Nm></Dbtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Second payment info</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

// ============================================================================
// TESTS
// ============================================================================

describe('parseCamtXml', () => {
  describe('camt.053 v08 parsing', () => {
    it('parses a minimal camt.053 statement', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);

      expect(result.messageType).toBe('camt.053');
      expect(result.accountIban).toBe('CH9300762011623852957');
      expect(result.accountCurrency).toBe('CHF');
      expect(result.entries).toHaveLength(1);
    });

    it('extracts opening and closing balances', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);

      expect(result.openingBalance).toEqual({
        amount: '10000.00',
        currency: 'CHF',
        date: '2026-03-01',
        creditDebit: 'CRDT',
      });
      expect(result.closingBalance).toEqual({
        amount: '12500.00',
        currency: 'CHF',
        date: '2026-03-01',
        creditDebit: 'CRDT',
      });
    });

    it('extracts entry reference (AcctSvcrRef)', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);
      expect(result.entries[0].entryReference).toBe('REF-001');
    });

    it('extracts QR reference from CdtrRefInf/Ref', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);
      expect(result.entries[0].reference).toBe('210000000003139471430009017');
    });

    it('extracts debtor name', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);
      expect(result.entries[0].debtorName).toBe('Max Muster AG');
    });

    it('extracts remittance info', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);
      expect(result.entries[0].remittanceInfo).toBe('Invoice payment RE-2026-00001');
    });

    it('sets positive amount for CRDT entries', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);
      expect(result.entries[0].amount).toBe('2500.00');
    });

    it('extracts booking and value dates', () => {
      const result = parseCamtXml(CAMT053_MINIMAL);
      expect(result.entries[0].bookingDate).toBe('2026-03-01');
      expect(result.entries[0].valueDate).toBe('2026-03-01');
    });
  });

  describe('camt.053 v04 parsing', () => {
    it('parses camt.053 v04 with namespace stripping', () => {
      const result = parseCamtXml(CAMT053_V04);

      expect(result.messageType).toBe('camt.053');
      expect(result.accountIban).toBe('CH4308307000289537312');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].entryReference).toBe('REF-V04');
    });

    it('handles PRCD opening balance and CLAV closing balance', () => {
      const result = parseCamtXml(CAMT053_V04);

      expect(result.openingBalance?.amount).toBe('5000.00');
      expect(result.closingBalance?.amount).toBe('5750.00');
    });

    it('extracts AddtlNtryInf as description', () => {
      const result = parseCamtXml(CAMT053_V04);
      expect(result.entries[0].description).toContain('Transfer from savings');
    });
  });

  describe('camt.054 parsing', () => {
    it('parses camt.054 notification format', () => {
      const result = parseCamtXml(CAMT054_NOTIFICATION);

      expect(result.messageType).toBe('camt.054');
      expect(result.accountIban).toBe('CH9300762011623852957');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].entryReference).toBe('NOTIF-001');
      expect(result.entries[0].amount).toBe('1200.50');
    });

    it('has no balances for camt.054', () => {
      const result = parseCamtXml(CAMT054_NOTIFICATION);

      expect(result.openingBalance).toBeNull();
      expect(result.closingBalance).toBeNull();
    });

    it('extracts debtor and remittance from camt.054', () => {
      const result = parseCamtXml(CAMT054_NOTIFICATION);

      expect(result.entries[0].debtorName).toBe('ABC GmbH');
      expect(result.entries[0].remittanceInfo).toBe('Zahlung Rechnung 2026-001');
    });
  });

  describe('amount signing', () => {
    it('negates DBIT amounts', () => {
      const result = parseCamtXml(CAMT053_DEBIT);

      expect(result.entries[0].amount).toBe('-350.00');
    });

    it('extracts creditor name from DBIT entries', () => {
      const result = parseCamtXml(CAMT053_DEBIT);

      expect(result.entries[0].creditorName).toBe('Swisscom AG');
    });
  });

  describe('reversal handling', () => {
    it('flips credit reversal to negative', () => {
      const result = parseCamtXml(CAMT053_REVERSAL);

      expect(result.entries[0].amount).toBe('-500.00');
      expect(result.entries[0].isReversal).toBe(true);
    });
  });

  describe('status filtering', () => {
    it('only includes BOOK entries, skips PDNG and INFO', () => {
      const result = parseCamtXml(CAMT053_PENDING);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].amount).toBe('200.00');
    });
  });

  describe('reference extraction', () => {
    it('uses EndToEndId as fallback reference', () => {
      const result = parseCamtXml(CAMT053_ENDTOEND);

      expect(result.entries[0].reference).toBe('E2E-REF-12345');
    });

    it('ignores NOTPROVIDED EndToEndId', () => {
      const result = parseCamtXml(CAMT053_ENDTOEND_NOTPROVIDED);

      expect(result.entries[0].reference).toBeNull();
    });

    it('extracts SCOR reference', () => {
      const result = parseCamtXml(CAMT053_SCOR_REF);

      expect(result.entries[0].reference).toBe('RF18539007547034');
    });
  });

  describe('multiple entries', () => {
    it('handles multiple entries in one statement', () => {
      const result = parseCamtXml(CAMT053_MULTIPLE_ENTRIES);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].amount).toBe('1000.00');
      expect(result.entries[0].entryReference).toBe('MULTI-001');
      expect(result.entries[1].amount).toBe('-2000.00');
      expect(result.entries[1].entryReference).toBe('MULTI-002');
      expect(result.entries[2].amount).toBe('500.00');
      expect(result.entries[2].entryReference).toBe('MULTI-003');
    });
  });

  describe('multiple transaction details', () => {
    it('takes first QR reference from multiple TxDtls', () => {
      const result = parseCamtXml(CAMT053_MULTIPLE_TX_DTLS);

      expect(result.entries[0].reference).toBe('QR-REF-FIRST');
      expect(result.entries[0].debtorName).toBe('First Payer');
    });

    it('builds description from all TxDtls', () => {
      const result = parseCamtXml(CAMT053_MULTIPLE_TX_DTLS);

      expect(result.entries[0].description).toContain('First Payer');
      expect(result.entries[0].description).toContain('Second Payer');
      expect(result.entries[0].description).toContain('Second payment info');
    });
  });

  describe('empty entries', () => {
    it('returns empty array when no entries present', () => {
      const result = parseCamtXml(CAMT053_EMPTY_ENTRIES);

      expect(result.entries).toHaveLength(0);
      expect(result.accountIban).toBe('CH9300762011623852957');
    });
  });

  describe('missing optional elements', () => {
    it('handles entries with no TxDtls gracefully', () => {
      const result = parseCamtXml(CAMT053_MULTIPLE_ENTRIES);
      const entry = result.entries[0];

      expect(entry.reference).toBeNull();
      expect(entry.debtorName).toBeNull();
      expect(entry.creditorName).toBeNull();
      expect(entry.remittanceInfo).toBeNull();
    });

    it('handles entry without AcctSvcrRef', () => {
      const result = parseCamtXml(CAMT053_PENDING);

      expect(result.entries[0].entryReference).toBeNull();
    });

    it('handles entry without ValueDate', () => {
      const result = parseCamtXml(CAMT053_MULTIPLE_ENTRIES);

      expect(result.entries[0].valueDate).toBeNull();
    });
  });

  describe('error handling', () => {
    it('throws on invalid XML', () => {
      expect(() => parseCamtXml('not xml at all <>')).toThrow();
    });

    it('throws on non-CAMT XML', () => {
      expect(() => parseCamtXml('<?xml version="1.0"?><Root><Data>hello</Data></Root>')).toThrow(
        'Invalid CAMT XML'
      );
    });

    it('throws on XML without Document element', () => {
      expect(() => parseCamtXml('<?xml version="1.0"?><Other></Other>')).toThrow(
        'missing Document root element'
      );
    });
  });
});

describe('normalizeIban', () => {
  it('strips spaces and uppercases', () => {
    expect(normalizeIban('CH93 0076 2011 6238 5295 7')).toBe('CH9300762011623852957');
  });

  it('handles lowercase input', () => {
    expect(normalizeIban('ch93 0076 2011 6238 5295 7')).toBe('CH9300762011623852957');
  });

  it('returns already normalized IBAN unchanged', () => {
    expect(normalizeIban('CH9300762011623852957')).toBe('CH9300762011623852957');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeIban('')).toBe('');
  });
});
