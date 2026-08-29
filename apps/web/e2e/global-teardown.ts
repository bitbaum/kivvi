import fs from "fs";
import path from "path";
import { cleanup, type TestData } from "./helpers";

export default async function globalTeardown() {
  const dataPath = path.join(__dirname, ".auth", "test-data.json");
  if (!fs.existsSync(dataPath)) return;

  try {
    const testData: TestData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    await cleanup(testData);
    fs.unlinkSync(dataPath);
    console.log("E2E teardown: cleaned up test data");
  } catch (error) {
    console.error("E2E teardown: cleanup failed", error);
  }
}
