import postgres from "npm:postgres";

const databaseUrl = Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const migrationDir = new URL("../db/migrations/", import.meta.url);
const files = [...Deno.readDirSync(migrationDir)]
  .filter((entry) => entry.isFile && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

const sql = postgres(databaseUrl, { max: 1 });

try {
  for (const file of files) {
    const path = new URL(file, migrationDir);
    const migration = await Deno.readTextFile(path);
    console.log(`Applying ${file}`);
    await sql.unsafe(migration);
  }
  console.log("Migrations applied.");
} finally {
  await sql.end();
}
