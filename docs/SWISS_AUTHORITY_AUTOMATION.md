# Making Swiss Authority Dealings Painless — Opportunities for Kivvi

**created_date**: 2026-07-13
**Status**: research synthesis + prioritized opportunities (not yet specced individually)
**Sources**: live 2026-07-13 — estv.admin.ch/de/mwst-online-abrechnen · ech.ch/de/ech/eCH-0217 (v2.0.0) · zefix.admin.ch ZefixPublicREST · uid-wse.admin.ch (UID Web Service V5) · ebill.ch + github.com/swico/ebill-swp-api · six-group.com Swiss Payment Standards · fedlex SR 220 / 221.431 (GeBüV) / 641.20 (MWSTG) · fer.ch (FER 21) · zewo.ch · swissdec.ch (ELM).

---

## The shape of the opportunity

Across the whole "dealing with authorities" surface, **there is almost no machine-to-machine submission API** (ESTV VAT, EasyGov registration — all human-portal upload/login). So the win is _not_ auto-submission. It's four things an ERP can own:

1. **Generate the exact standard format** the authority accepts, so filing = one upload (VAT eCH-0217, banking ISO 20022, eBill yellowbill).
2. **Validate against public lookup APIs** so master data is correct and audits are clean (Zefix, UID/VAT register).
3. **Guarantee the legal record-keeping properties** so an audit/Treuhänder handoff is trivial (GeBüV immutability + audit trail + retention).
4. **Produce the required reports** in the right structure (VAT Ziffern, FER-21 Fondsrechnung, Zewo ratios).

Two lenses below: **[R] helps revamp-it now** (0 %-VAT gemeinnütziger Verein with a Treuhänder, receiving Spenden/Subventionen); **[P] product win** for future VAT-paying KMU customers. Many are both.

| #   | Opportunity                                     | Lens        | Effort | Kivvi today                   |
| --- | ----------------------------------------------- | ----------- | ------ | ----------------------------- |
| A1  | GeBüV immutable bookkeeping + audit trail       | R+P         | M      | ⚠️ gap (delete path exists)   |
| A2  | Zefix + UID/VAT enrichment                      | R+P         | S–M    | ❌ none                       |
| A3  | QR-bill structured-address + QR-IBAN pairing    | R+P         | S      | 🟡 verify                     |
| B1  | eCH-0217 v2.0.0 VAT-return XML + Ziffern screen | P (R minor) | M      | 🟡 generic VAT summary only   |
| B2  | Bezugsteuer (reverse charge)                    | P           | S–M    | ❌ none                       |
| C1  | pain.001.001.09 supplier payment run            | P (R minor) | M      | ❌ none                       |
| C2  | camt.053/.054 confirm .001.08 + structured addr | R+P         | S      | ✅ solid (confirm version)    |
| D1  | FER-21 fund accounting + Fondsrechnung          | R           | M–L    | 🟡 fund dimension half-there  |
| D2  | Zewo cost-category tags + ratio dashboard       | R (if Zewo) | M      | ❌ none                       |
| D3  | Tax-exemption document pack                     | R           | S      | ❌ none                       |
| D4  | Nicht-Entgelt flags (Spende/Subvention)         | R           | S      | 🟡 classifier exists, unwired |
| E1  | eBill sender (network-partner adapter)          | R+P         | M–L    | ❌ none                       |
| E2  | Swissdec ELM payroll                            | P (future)  | XL     | ❌ n/a (no payroll)           |

---

## Tier A — foundational, build now (cheap now, expensive to retrofit)

### A1 — GeBüV-compliant immutable bookkeeping **[R+P]**

The legal bedrock (OR 957a/958f + GeBüV SR 221.431, in force; **10-year** retention, 20 for immovable-property docs). Records must be stored so **any change is detectable**; a Postgres row is a _changeable medium_, so it's only compliant if integrity is technically guaranteed. What Kivvi must enforce:

- **Posted = immutable.** Once a journal entry / sent invoice is posted, it must be **non-editable and non-deletable**; corrections only by **Storno** (reversal counter-entry). Storno logic already exists (`accounting-integration.ts:244/283`) — good — **but a `delete(journalEntries)` path exists (`accounting.ts:580`)**: restrict it to unposted/draft only, or remove it. This is the single most load-bearing fix; everything else (VAT credibility, audit-readiness) rests on it. Ties to the **closed-period locking** gap in `KIVITENDO_REPLACEMENT_GAPS.md` §2.2.
- **Append-only audit trail** — a hash-chain (each posting hashes the prior) + provable posting timestamp + access logging, so tampering is detectable per GeBüV Art. 9.
- **Gap-free sequential numbering** — already solid (`number-sequences.ts`, atomic). Keep.
- **PDF/A archival + Verfahrensdokumentation** — export posted invoices as PDF/A; ship a written procedure doc template.

_Why first:_ it's the property that makes a Treuhänder trust the books and an ESTV/audit review painless — the essence of "easier dealings with authorities."

### A2 — Zefix + UID/VAT-register enrichment **[R+P]**

The two genuinely public APIs in this whole domain. One server-side domain module (`packages/core/src/domain/uid-register.ts`), cached on the contact, best-effort (never a hard transaction dependency):

- **Zefix REST** (`zefix.admin.ch/ZefixPublicREST/api/v1`, HTTP Basic — free creds by emailing zefix@bj.admin.ch): search by name / `GET /company/uid/{CHE-…}` → legal name, form, seat/canton, address, **HR status** (ACTIVE/CANCELLED). Autofill `contacts` on entry.
- **UID Web Service** (`uid-wse.admin.ch/V5.0/PublicServices.svc`, SOAP, free, **20 req/min**): `ValidateUID` + `GetByUID` expose **VAT-registration status** (`vatStatus`, `vatEntryDate`) — _this_ is the VAT lookup (no separate public ESTV VAT API). Show a "MWST-registriert seit …" badge; **on purchase invoices where Vorsteuer is claimed, warn if the vendor isn't VAT-registered** (guards invalid input-VAT deduction). ⚠️ SOAP V5 retires ~2028 → isolate behind the one module so migration is a one-file change.

_Payoff:_ correct partner master data, valid UIDs, and the VAT flag that both Bezugsteuer (B2) and eBill (E1) depend on.

### A3 — QR-bill structured-address + QR-IBAN pairing **[R+P]**

QR-bill generation is solid, but two **dated correctness** items to verify in `pdf-generation.ts`:

- **Structured address is mandatory since 22.11.2025** (SPS 2025 — combined address dropped). Confirm the swissqrbill creditor/debtor data uses structured fields (street / building no. / postal code / town), not the retired combined format, or banks reject the slip. Target QR-bill IG **v2.3**.
- **QR-IBAN ↔ QRR pairing.** A 27-digit QRR reference is only valid with a **QR-IBAN** (IID 30000–31999). Kivvi assigns a QRR to every invoice (`documents.ts:487`) and sets it unconditionally (`pdf-generation.ts:482`) — confirm it uses QRR **only** when the company IBAN is a QR-IBAN, and falls back to **SCOR** (Creditor Reference, normal IBAN) or **NON** otherwise. Otherwise the payment part is rejected.

---

## Tier B — the headline VAT-filing win **[mostly P]**

### B1 — eCH-0217 v2.0.0 VAT-return XML + Ziffern review screen

Online VAT filing is **mandatory since 1 Jan 2025** (paper abolished). The portal ("MWST-Abrechnung pro", AGOV login the sole method from 31 Oct 2026) accepts **only eCH-0217 spec E-MWST v2.0.0** XML upload — no submit API. So: **ERP generates the XML → user uploads.** Build:

- A **Ziffern-mapped VAT report** aggregating the journal into the exact effective-method boxes: turnover 200/205/220/221/225/230/235/280→289→299; tax 301/302 (8.1), 311/312 (2.6), 341/342 (3.8), 380/381 (Bezugsteuer)→399; input 400/405/410/415/420→479; 500 payable / 510 refund; declaratory 900 (Subventionen → drive input-tax reduction) / 910 (Spenden). Kivvi's current `getVatReport` is a generic rate summary — this replaces it with a review screen.
- A **valid eCH-0217 v2.0.0 XML exporter** validated against the official XSD (`sendingApplication` = Kivvi), supporting **effektiv + Saldosteuersatz** (SSS eligibility ≤ CHF 5.024M turnover & ≤ CHF 108k tax; semi-annual; multi-rate since 2025) + **Pauschalsteuersatz** (public bodies/associations). Per-company **method + cadence** config.

**[R] note:** revamp-it files at 0 % VAT, so this is low personal value — but it's the #1 feature for _every_ VAT-paying customer and the clearest "deal with authorities" story. Build for the product; verify only that a 0 %-VAT company produces a clean all-zero return.

### B2 — Bezugsteuer / reverse charge (Art. 45 MWSTG) **[P]**

Foreign services from a non-CH-VAT-registered supplier (place of supply CH) → recipient self-assesses Swiss VAT. VAT-registered recipients: no threshold, cash-neutral via same-period input deduction; non-registered: CHF 10,000/yr threshold then Art. 66 registration within 60 days (input **not** recoverable — a real cost for exempt bodies). Build: flag foreign-service ER invoices (vendor country + "CH-VAT-registered?" from A2 + goods/service indicator) → auto-book mirrored entries (Cr 2200 / Dr 1170) → map to Ziffer 380/381/400 feeding B1. Running CHF-10k tracker for non-registered orgs.

---

## Tier C — banking rails (dated deadlines)

- **C1 — pain.001.001.09 supplier payment run [P, R-minor]**: the missing outbound file (Kivvi can't pay creditors via bank today). Target ISO-2019 gen `pain.001.001.09`; **structured addresses mandatory Nov 2026** — engineer that now. revamp-it: low volume (37 open payables) but a dated product must-do.
- **C2 — camt.053/.054 [R+P, mostly done]**: import is solid. Confirm it targets `.001.08` and reads the QRR/SCOR reference per entry (it does); no new build, just version confirmation.

---

## Tier D — Verein / NPO differentiator (directly serves revamp-it) **[R]**

No API anywhere here — the opportunity is **correct data structure + report generation**, and it's a genuine differentiator no generic ERP offers.

### D1 — FER-21 fund accounting + Fondsrechnung

revamp-it **is** a gemeinnütziger Verein; Zewo (D2) makes FER-21 effectively mandatory. **Kivvi is halfway there**: `costCenterKind` already has `'fund'`. Finish it:

- **Fund class on the fund dimension**: `zweckgebunden_extern` (donor-restricted → **Fondskapital**, not equity) vs `intern_gebunden` / `frei` (→ **Organisationskapital**). The decisive test is **who imposed the restriction** (third party vs the board).
- **Fondsrechnung / Kapitalveränderungsrechnung** report: per capital component, columns **Bestand 1.1 → Zuweisungen → Verwendung → interne Transfers → Bestand 31.12**, reconciling to the Bilanz; fund movements shown as capital movements, not netted into the operating result. **No-negative-fund rule**: overspend routes to free capital.
- Plus the FER-21 statement set: Betriebsrechnung, Geldflussrechnung, Anhang, Leistungsbericht.

### D2 — Zewo cost-category tags + ratio dashboard **[R, if Zewo pursued]**

Second orthogonal dimension: tag each expense `projekt` / `mittelbeschaffung` / `administration` (Zewo-Methode, binding since 2018 accounts) + allocation rules for shared costs. Auto-compute the Standard-9 ratios: **project ≥ 65 %, admin+fundraising ≤ 35 %, fundraising ≤ 25 %**, reserve months (Org-Kapital 3–18; incl. Fondskapital 3–24), with green/orange/red flags. **Leistungsbericht scaffold** fed by Kivvi's existing impact tracking (devices refurbished, CO₂ avoided, people served) — the impact module maps straight onto the required performance section.

### D3 — Tax-exemption document pack **[R]**

Steuerbefreiung (Art. 56 lit. g DBG) is form/PDF per canton, no API. One-click bundle: **Statuten + Jahresrechnung + Tätigkeitsbericht + Protokolle** as a PDF pack for the kantonales Steueramt (cantons periodically re-review; the org bears the burden of proof).

### D4 — Nicht-Entgelt flags **[R]**

Mark **Spenden** and **Subventionen** as Nicht-Entgelt (Art. 18 Abs. 2 MWSTG): excluded from the **CHF 250,000** Verein VAT threshold, and Subventionen trigger **Vorsteuerkürzung** (Art. 33). `payment-classification.ts` already classifies these — wire it into booking + the threshold/VAT calc (also the reconciliation-UI gap in the replacement doc). Treuhänder-gated per the MWST question doc.

---

## Tier E — future / product phase

- **E1 — eBill sender [R+P]**: SIX national e-invoicing; **you cannot connect to SIX directly — only via a certified Netzwerkpartner** (Billte, PostFinance, Abacus…). SIX publishes the open **eBill SWP API** (REST, github.com/swico/ebill-swp-api); payload is **yellowbill Invoice XML**. Build a **pluggable network-partner adapter** behind the `documents` domain (start with Billte/PostFinance). Small model additions (pass the 2–3-file test): eBill identifier + registration status on `contacts` (email for private / UID for business), delivery status on `documents`. You already have QR reference + QR-IBAN ≈ 80 % of the payload. Not mandated (B2B voluntary; only federal B2G ≥ CHF 5k uses Peppol/EN-16931, not eBill) — build it because Swiss customers actually pay this way, after Tiers A–C.
- **E2 — Swissdec ELM payroll [P, far future]**: one certified submission → AHV/QST/UVG/BVG/BFS. **ELM 6.0** (target, cert opens Apr 2026); real weight is a **full Swiss payroll engine first** (per-canton Quellensteuer, AHV/UVG/BVG caps), then a SOAP transmitter + Suva-gated certification (~CHF 20k/yr). revamp-it has **no payroll** → do not scope into any current cycle; separate evaluation with a payroll specialist.

**No API exists — do not build auto-submission for:** EasyGov.swiss (registration; human portal only) and ESTV VAT submission (XML-upload only). Ceiling is prepared data + deep-link/hand-off.

---

## Recommended order (leverage-ranked)

1. **A1 GeBüV immutability** — foundational; also closes the period-locking gap. Cheap now, costly later.
2. **A2 Zefix + UID/VAT enrichment** — high daily value, public APIs, one module; feeds B2 + E1.
3. **A3 QR-bill structured-address + QR-IBAN** — dated correctness fix, small.
4. **B1 eCH-0217 VAT export** — the headline product feature (every VAT customer); pairs with the Ziffern screen.
5. **D1 FER-21 fund + Fondsrechnung** — the revamp-it Verein differentiator (fund dimension already half-built).
6. Then C1 pain.001, D2–D4 NPO polish, B2 Bezugsteuer; **E1 eBill** once a partner is chosen; **E2 ELM** only if payroll becomes a product goal.

**For revamp-it specifically**, the highest-value items are **A1, A2, D1, D4, D3** — audit-proof books, validated partners, and Verein-grade fund/exemption reporting. The VAT-filing machinery (B1/B2) is a product win they personally barely need at 0 % VAT.
