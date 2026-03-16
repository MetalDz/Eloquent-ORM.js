import fs from "fs";
import path from "path";

describe("NoSQL phase 7 mongo seed smoke contract", () => {
  test("pack-smoke script covers explicit db:seed --mongo --test runtime checks", () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/pack-smoke.js"),
      "utf8"
    );

    const requiredSnippets = [
      'require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });',
      "const uniqueMongoTestDb = `eloquent_pack_smoke_",
      '["db:seed", "--test", "--mongo", "--class", "GeoLocationSeeder"]',
      "mongo-seed-check.cjs",
      'const uri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;',
      'const databaseName = process.env.MONGO_TEST_DB || process.env.MONGO_DB || ${JSON.stringify(',
      '`${sanitizePathSegment(packageName).toLowerCase()}_db`',
      'const count = await db.collection("geolocations").countDocuments();',
      'if (count !== 2)',
      "geo-count:",
      '["migrate:fresh", "--test", "--mongo", "--force"]',
      '["migrate:reset", "--test", "--mongo"]',
    ];

    for (const snippet of requiredSnippets) {
      expect(script).toContain(snippet);
    }
  });
});
