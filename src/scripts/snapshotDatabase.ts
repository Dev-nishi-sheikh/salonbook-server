import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { config } from '../config';

/**
 * Non-destructive logical backup of every collection in the configured database.
 * Writes one JSON file per collection and verifies the written document counts
 * against the live counts. Never writes to the database.
 *
 * Usage: node dist/scripts/snapshotDatabase.js [outputDir]
 */
const COLLECTIONS_TO_SKIP = new Set<string>();

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const snapshot = async (outputDir?: string) => {
  await mongoose.connect(config.mongodb.uri);
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB connection is not ready');
  }

  const databaseName = db.databaseName;
  const targetDir =
    outputDir ||
    path.join('/home/ubuntu/backups', `salonbook-${new Date().toISOString().replace(/[:.]/g, '-')}`);

  await fs.promises.mkdir(targetDir, { recursive: true });

  const collectionNames = (await db.listCollections().toArray()).map(c => c.name).sort();
  const manifest: Array<{ collection: string; count: number; bytes: number; file: string }> = [];

  for (const name of collectionNames) {
    if (COLLECTIONS_TO_SKIP.has(name)) continue;

    const documents = await db.collection(name).find({}).toArray();
    const file = path.join(targetDir, `${name}.json`);
    await fs.promises.writeFile(
      file,
      JSON.stringify({ database: databaseName, collection: name, count: documents.length, documents }, null, 2),
      'utf8'
    );

    const bytes = (await fs.promises.stat(file)).size;
    manifest.push({ collection: name, count: documents.length, bytes, file });
    console.log(`snapshot ${name}: ${documents.length} docs -> ${file} (${formatBytes(bytes)})`);
  }

  const manifestFile = path.join(targetDir, 'manifest.json');
  await fs.promises.writeFile(
    manifestFile,
    JSON.stringify(
      {
        database: databaseName,
        createdAt: new Date().toISOString(),
        collections: manifest,
      },
      null,
      2
    ),
    'utf8'
  );

  // Verify every snapshot file round-trips to the same document count.
  let verificationFailed = false;
  for (const entry of manifest) {
    const raw = await fs.promises.readFile(entry.file, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.documents) || parsed.documents.length !== entry.count) {
      verificationFailed = true;
      console.error(`VERIFY FAILED ${entry.collection}: expected ${entry.count} docs`);
    }
  }

  const liveTotal = manifest.reduce((sum, e) => sum + e.count, 0);
  console.log(
    verificationFailed
      ? `BACKUP VERIFICATION FAILED (${liveTotal} docs across ${manifest.length} collections)`
      : `BACKUP VERIFIED: ${liveTotal} docs across ${manifest.length} collections in ${targetDir}`
  );

  await mongoose.disconnect();

  if (verificationFailed) {
    process.exit(1);
  }
};

snapshot(process.argv[2])
  .then(() => process.exit(0))
  .catch(error => {
    console.error('SNAPSHOT ERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
  });