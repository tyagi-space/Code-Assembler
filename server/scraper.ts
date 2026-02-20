import Parser from 'rss-parser';
import { storage } from './storage';
import cron from 'node-cron';

const parser = new Parser();

const RSS_FEEDS = [
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', source: 'BBC' },
  { url: 'http://rss.cnn.com/rss/edition.rss', category: 'World', source: 'CNN' },
  { url: 'https://techcrunch.com/feed/', category: 'Technology', source: 'TechCrunch' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', category: 'National', source: 'The Hindu' },
];

export async function fetchNews() {
  let count = 0;
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        if (!item.title || !item.link) continue;
        
        const existing = await storage.getNewsByUrl(item.link);
        if (!existing) {
          await storage.createNews({
            title: item.title,
            description: item.contentSnippet || item.content || '',
            content: item.content || item.contentSnippet || '',
            imageUrl: item.enclosure?.url || null,
            sourceName: feed.source,
            sourceUrl: item.link,
            category: feed.category,
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          });
          count++;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${feed.source}:`, err);
    }
  }
  return count;
}

export function setupCron() {
  cron.schedule('0 6 * * *', async () => {
    console.log('Running daily news fetch...');
    await fetchNews();
  });
}
