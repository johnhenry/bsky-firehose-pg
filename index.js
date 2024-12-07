import sqlite from 'sqlite';

import getUrls from 'get-urls';

import { Subscription } from '@atproto/xrpc-server';
import { cborToLexRecord, readCar } from '@atproto/repo';

const SERVICE = 'bsky.social';
const METHOD = 'com.atproto.sync.subscribeRepos';
const COLLECTION = 'app.bsky.feed.post';
const CREATE_ACTION = 'create';

const args = process.argv.slice(2);

const sql = sqlite.open('./bsky.db');

console.info("Connected to database.")

// Gracefully handle shutdown
process.on('SIGINT', async () => {
  console.info('\nReceived SIGINT (Ctrl+C). Gracefully shutting down...');
  await sql.close()
  process.exit(0);
});

// start subscription to the firehose
const subscription = new Subscription({
  service: `wss://${SERVICE}`,
  method: METHOD,
  getState: () => ({}),
  validate: (value) => value,
});

console.info("Started subscription.")

/**
 * Inserts a record into the urls table with the specified timestamp, url, author, text, and createdAt.
 * 
 * @param {string} timestamp 
 * @param {string} url 
 * @param {string} author 
 * @param {string} text 
 * @param {string} createdAt 
 * @returns {Promise<void>}
 */
async function insertRecord(timestamp, url, author, text, createdAt) {
  try {
    const rec = await sql.run(`
      INSERT INTO bsky_urls (timestamp, url, author, text, createdAt) VALUES (?, ?, ?, ?, ?)
    `, [timestamp, url, author, text, createdAt]);
    console.info(url)
  } catch (err) {
    console.error(err)
  }
}

const searchString = "https://";

/**
 * Handle firehose events
 * 
 * @param {event} event
 * @returns {Promise<void>}
 */
const handleEvent = async (event) => {
  try {
    const car = await readCar(event.blocks);

    for (const op of event.ops) {
      if (op.action !== CREATE_ACTION) continue;

      const recBytes = car.blocks.get(op.cid)
      if (!recBytes) continue;

      const rec = cborToLexRecord(recBytes);

      const coll = op.path.split('/')[ 0 ];
      if (coll !== COLLECTION) continue;

      if (rec.text.toLowerCase().includes(searchString)) {
        
        const urls = getUrls(rec.text)

        urls.forEach((url) => {
          insertRecord(rec.createdAt, url, rec.author, rec.text, rec.createdAt)
        })

      }
    }
    
  } catch {
    // Add error handling here eventually
  }
};

for await (const event of subscription) {
  handleEvent(event);
}
