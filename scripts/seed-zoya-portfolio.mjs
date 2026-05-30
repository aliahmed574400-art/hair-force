import fs from "node:fs";
import pg from "pg";

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing files
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

if (!DATABASE_URL) {
  console.error("No DATABASE_URL / POSTGRES_URL found in env.");
  process.exit(1);
}

const portfolioItems = [
  {
    id: "zoya-portfolio-01",
    url: "/featured-stylists/fresha-01.jpg",
    type: "image",
    caption: "Soft glam bridal trial",
    serviceId: "srv-402"
  },
  {
    id: "zoya-portfolio-02",
    url: "/featured-stylists/fresha-04.jpg",
    type: "image",
    caption: "Classic bridal",
    serviceId: "srv-402"
  },
  {
    id: "zoya-portfolio-03",
    url: "/featured-stylists/fresha-08.jpg",
    type: "image",
    caption: "Engagement glam",
    serviceId: "srv-401"
  },
  {
    id: "zoya-portfolio-04",
    url: "/featured-stylists/fresha-02.jpg",
    type: "image",
    caption: "Party prep",
    serviceId: "srv-401"
  },
  {
    id: "zoya-portfolio-05",
    url: "/featured-stylists/fresha-06.jpg",
    type: "image",
    caption: "Camera-ready event",
    serviceId: "srv-401"
  },
  {
    id: "zoya-portfolio-06",
    url: "/featured-stylists/fresha-09.jpg",
    type: "image",
    caption: "Long-wear finish",
    serviceId: "srv-403"
  },
  {
    id: "zoya-portfolio-07",
    url: "/featured-stylists/fresha-03.jpg",
    type: "image",
    caption: "Soft contour detail",
    serviceId: "srv-401"
  },
  {
    id: "zoya-portfolio-08",
    url: "/featured-stylists/fresha-05.jpg",
    type: "image",
    caption: "Skin prep routine",
    serviceId: "srv-403"
  }
];

const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();

  const beforeResult = await client.query(
    "SELECT slug, portfolio_items FROM vendor_profiles WHERE slug = $1",
    ["zoya-bridal-room"]
  );

  if (!beforeResult.rowCount) {
    console.error("zoya-bridal-room not found in vendor_profiles.");
    process.exit(1);
  }

  console.log(
    "BEFORE: portfolio_items has",
    (beforeResult.rows[0].portfolio_items || []).length || 0,
    "entries"
  );

  const updateResult = await client.query(
    "UPDATE vendor_profiles SET portfolio_items = $2::jsonb WHERE slug = $1 RETURNING slug",
    ["zoya-bridal-room", JSON.stringify(portfolioItems)]
  );

  console.log("Updated rows:", updateResult.rowCount);

  const afterResult = await client.query(
    "SELECT portfolio_items FROM vendor_profiles WHERE slug = $1",
    ["zoya-bridal-room"]
  );

  console.log(
    "AFTER: portfolio_items has",
    (afterResult.rows[0].portfolio_items || []).length || 0,
    "entries"
  );
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
