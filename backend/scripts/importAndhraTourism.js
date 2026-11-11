import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import TourismListing from '../models/TourismListing.js';
import listings from '../data/andhraPradeshTourism.json' with { type: 'json' };

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const apply = process.argv.includes('--apply');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

console.log(`${apply ? 'Importing' : 'Dry run:'} ${listings.length} Andhra Pradesh tourism listings.`);
console.log('No users, business posts, reviews, likes, comments, or genuine business records are modified.');
if (!apply) {
  for (const listing of listings) console.log(`- ${listing.slug}: ${listing.name} (${listing.sourceName})`);
  console.log('Run with --apply to upsert these records into the tourismlistings collection.');
  process.exit(0);
}

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const results = await Promise.all(listings.map((listing) => TourismListing.updateOne(
    { slug: listing.slug },
    { $set: listing, $setOnInsert: { active: true } },
    { upsert: true, runValidators: true }
  )));
  console.log(`Upserted ${results.length} catalog records.`);
} finally {
  await mongoose.disconnect();
}
