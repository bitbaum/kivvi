#!/usr/bin/env tsx
import { createPostgresClient } from "@kivvi/database";
import { companies } from "@kivvi/database";

const db = createPostgresClient(process.env.DATABASE_URL!);

async function main() {
  const allCompanies = await db.select().from(companies).limit(5);
  console.log(JSON.stringify(allCompanies, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
