# Kivvi — Product Identity

---

## Mission

**Make it effortless for businesses that sell used, donated, and refurbished goods to manage their operations — so they can focus on giving things a second life.**

---

## Vision

Every item that can be reused, will be. Kivvi removes the operational friction that stops secondhand businesses from scaling their impact.

---

## Values

### 1. Things have a history. Track it.

Every item in a secondhand business arrived from somewhere, was assessed, maybe repaired, and was given a new purpose. The software should honor this journey, not force it into a "purchase → sell" mold.

### 2. Anyone should be able to use this.

A Brockenhaus volunteer on their first day, a repair café technician, a vintage shop owner with zero IT background. If they need training beyond 15 minutes, we've failed. AI handles the complexity; the human makes the decisions.

### 3. Impact is not optional.

Every device saved from the shredder, every piece of furniture given a second life, every kilo of e-waste avoided — Kivvi tracks it. Not because it's nice to have, but because it's why these businesses exist.

### 4. Swiss precision, human warmth.

Money is not a float. VAT is not optional. QR-bills are legally required. We get the precision right so the humans can focus on the warm, messy reality of working with donated goods and budget-conscious customers.

### 5. Open source, like the goods we help circulate.

Software, like hardware, should be reusable. Kivvi is built on and contributes to open source. Our customers believe in the commons; so do we.

### 6. AI serves the mission, not the other way around.

AI fills forms, suggests prices, and handles routine work. But it never makes irreversible decisions without human review. The volunteer decides; the AI assists.

---

## Target Customers

### Persona 1: The Computer Refurbisher

**Example**: revamp-it (Zürich), Büro Mühle, TechInTheBox

~20-person nonprofit. Receives donated computers from companies and individuals. Tests, repairs, installs Linux, sells at flexible prices. Ships to social projects (Linuxola, Compirat). Uses Kivitendo today — unreliable stock counts, no condition tracking, no intake workflow.

**Core need**: Intake → test → repair → price → sell, with reliable inventory and donation receipts.

**Revenue model**: Low margins on hardware, supplemented by donations and service fees. Every CHF of operational efficiency goes directly to impact.

### Persona 2: The Brockenhaus / Charity Shop

**Example**: Brocki Zürich, Caritas Secondhand, Heilsarmee Brockenstuben, Emmaus

Receives donated household goods (furniture, clothing, kitchenware, electronics). Volunteers sort, price, and sell in physical shops. Volume is high, individual item value is low. Pricing is gut-feel. No inventory system — items arrive and are put on shelves.

**Core need**: Simple intake logging, flexible pricing, volunteer-friendly UI, impact reporting for annual Vereinsbericht.

**Revenue model**: Sales fund social programs. Need to justify impact to donors and grant-givers.

### Persona 3: The Vintage / Specialty Reseller

**Example**: Vintage clothing stores, used bike shops, antiquarian bookshops, musical instrument resellers, used car dealers (small/independent)

Buys and sells specific categories of used goods. Cares about provenance, condition, and presentation. Runs a physical shop and/or online presence. Needs to track individual items, often by serial or unique ID. Margins are higher but volume is lower.

**Core need**: Individual item tracking with condition and history, condition-based pricing, webshop integration.

**Revenue model**: Buy low, add value (cleaning, repair, certification), sell at market price for condition.

---

## What Makes Secondhand Different

Seven ways used goods break normal ERPs:

### 1. Intake is not purchasing.

Goods arrive as donations, trade-ins, consignment, or below-market purchases. There may be no purchase price. There may be a donation receipt instead of an invoice. The "supplier" is often a one-time individual.

### 2. Every item has a condition.

The same product model varies from "like new" to "parts only." Condition determines price, routing (sell/repair/recycle), and display. Standard ERPs have one price per SKU.

### 3. Products flow backwards.

Items come FROM customers, not just TO them. Returns, trade-ins, take-backs — the reverse flow is the core business, not an exception.

### 4. Testing and repair is part of operations.

Before an item can sell, it may need testing, cleaning, repair, OS installation, or quality checking. This is a multi-step workflow with different people at each stage.

### 5. Pricing is flexible.

Guide prices (Richtpreise) that buyers adjust. Condition-based pricing. Negotiable prices. Consignment splits. No ERP supports "the customer picks their own price within a range."

### 6. Inventory is mixed.

Some items are commodities (500 identical power cables). Others are unique (this specific Dell laptop with this specific configuration and this specific dent). Need both quantity-based and individual tracking in one system.

### 7. Impact is the point.

These aren't just businesses optimizing profit. They exist to reduce waste, give access to technology, support low-income communities. Impact metrics (items saved, CO2 avoided, people served) are as important as financial metrics.

---

## Product Principles

### AI-first, not AI-added

AI is not a chatbot bolted onto an ERP. It's the primary interface. Type what you need in plain language — "50 laptops donated by UBS" — and the system does the right thing. The AI understands secondhand workflows: intake, condition grading, pricing, repair routing.

### Guided, not configured

Every screen should guide the user to the next step. Empty states explain what to do. Forms pre-fill with smart defaults. The user should never wonder "what do I do here?" The ERP adapts to the workflow, not the other way around.

### One command away

Cmd+K opens the AI command bar. Type anything: "create intake from Swisscom, 30 monitors" or "what's the value of untested items?" or "generate donation receipt for last week's intake." No menu diving, no training manual.

### Swiss by default

QR-bills, VAT rates (8.1% / 2.6% / 0%), Rappen rounding, CAMT bank import, Swiss chart of accounts (KMU Kontenrahmen), de-CH locale — all built in from day one. Not a US product "localized" for Switzerland.

### Impact visible everywhere

Every sale shows: "This item was diverted from e-waste." The dashboard shows: devices refurbished this month, kg saved from landfill, CO2 avoided. Annual impact reports generate automatically for the Vereinsbericht.

---

## Positioning

**Tagline**: Kivvi — the ERP that knows things have a history.

**One-liner**: Warenwirtschaft für Secondhand, Spenden und Wiederverwertung.

**Elevator pitch**: Kivvi is an ERP built for businesses that sell used, donated, and refurbished goods — Brockenhäuser, computer refurbishers, vintage shops, repair workshops. Unlike generic ERPs that assume you buy new and sell new, Kivvi handles intake, condition grading, repair workflows, and flexible pricing natively. With AI that understands secondhand workflows and Swiss compliance built in, it replaces the spreadsheets and workarounds that these businesses have been stuck with.

---

_Every item that passes through your hands deserves to be tracked, valued, and given its best possible future. Kivvi makes that effortless._
