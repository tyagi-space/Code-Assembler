import Parser from 'rss-parser';
import { storage } from './storage';
import cron from 'node-cron';

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Code-Assembler-NewsBot/1.0 (+RSS fetcher)",
  },
});

const RSS_FEEDS = [
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', source: 'BBC' },
  { url: 'http://rss.cnn.com/rss/edition.rss', category: 'World', source: 'CNN' },
  { url: 'https://techcrunch.com/feed/', category: 'Technology', source: 'TechCrunch' },
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', category: 'National', source: 'The Hindu' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', category: 'Health', source: 'NYT Health' },
  { url: 'https://www.sciencedaily.com/rss/top/science.xml', category: 'Science', source: 'ScienceDaily' },
  { url: 'https://www.espn.com/espn/rss/news', category: 'Sports', source: 'ESPN' },
  { url: 'https://www.hollywoodreporter.com/feed/', category: 'Entertainment', source: 'HollywoodReporter' },
  { url: 'https://www.rollingstone.com/music/music-news/feed/', category: 'Entertainment', source: 'RollingStone' }

];

function parsePublishedAt(item: any): Date | null {
  const raw = item?.isoDate || item?.pubDate || item?.published || item?.updated;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isFromCurrentUtcDate(date: Date, now = new Date()): boolean {
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return null;
}

function isSourceLogoUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes("google.com/s2/favicons");
}

function extractImageFromHtml(html?: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return normalizeUrl(match?.[1] || null);
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractParagraphText(html: string): string {
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = paragraphRegex.exec(html)) !== null) {
    const cleaned = stripHtmlTags(match[1] || "");
    if (cleaned.length > 40) {
      paragraphs.push(cleaned);
    }
  }

  if (paragraphs.length === 0) return "";
  return paragraphs.slice(0, 10).join("\n\n");
}

function extractImageUrl(item: any): string | null {
  const directCandidates = [
    item?.enclosure?.url,
    item?.thumbnail,
    item?.image?.url,
    item?.["media:thumbnail"]?.url,
    item?.["media:content"]?.url,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) return normalized;
  }

  const mediaThumb = item?.["media:thumbnail"];
  if (Array.isArray(mediaThumb)) {
    for (const entry of mediaThumb) {
      const normalized = normalizeUrl(entry?.$?.url || entry?.url);
      if (normalized) return normalized;
    }
  }

  const mediaContent = item?.["media:content"];
  if (Array.isArray(mediaContent)) {
    for (const entry of mediaContent) {
      const normalized = normalizeUrl(entry?.$?.url || entry?.url);
      if (normalized) return normalized;
    }
  }

  return (
    extractImageFromHtml(item?.["content:encoded"]) ||
    extractImageFromHtml(item?.content) ||
    null
  );
}

function absolutizeImageUrl(candidate: string, articleUrl: string): string | null {
  try {
    return new URL(candidate, articleUrl).toString();
  } catch {
    return null;
  }
}

function extractMetaImage(html: string, articleUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const normalized = normalizeUrl(match?.[1] || null);
    if (normalized) return normalized;
    if (match?.[1]) {
      const abs = absolutizeImageUrl(match[1], articleUrl);
      if (abs) return abs;
    }
  }

  return null;
}

function extractJsonLdImage(html: string, articleUrl: string): string | null {
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    const raw = scriptMatch[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of candidates) {
        const imageField = entry?.image;
        if (!imageField) continue;

        if (typeof imageField === "string") {
          return normalizeUrl(imageField) || absolutizeImageUrl(imageField, articleUrl);
        }
        if (Array.isArray(imageField)) {
          for (const value of imageField) {
            if (typeof value === "string") {
              const normalized = normalizeUrl(value) || absolutizeImageUrl(value, articleUrl);
              if (normalized) return normalized;
            }
            if (value?.url) {
              const normalized =
                normalizeUrl(value.url) || absolutizeImageUrl(String(value.url), articleUrl);
              if (normalized) return normalized;
            }
          }
        }
        if (imageField?.url) {
          const normalized =
            normalizeUrl(imageField.url) || absolutizeImageUrl(String(imageField.url), articleUrl);
          if (normalized) return normalized;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchArticleImage(articleUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(articleUrl, {
      headers: { "User-Agent": "Code-Assembler-NewsBot/1.0 (+article image fetcher)" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    return (
      extractMetaImage(html, articleUrl) ||
      extractJsonLdImage(html, articleUrl) ||
      extractImageFromHtml(html)
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchArticleExcerpt(articleUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(articleUrl, {
      headers: { "User-Agent": "Code-Assembler-NewsBot/1.0 (+article text fetcher)" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const excerpt = extractParagraphText(html);
    return excerpt || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNews() {
  let count = 0;
  const now = new Date();
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        if (!item.title || !item.link) continue;
        const publishedAt = parsePublishedAt(item);
        if (!publishedAt || !isFromCurrentUtcDate(publishedAt, now)) continue;

        const thumbnail = extractImageUrl(item) || (await fetchArticleImage(item.link));
        const fetchedExcerpt = await fetchArticleExcerpt(item.link);
        const baseContent = item.content || item.contentSnippet || '';
        const richContent =
          fetchedExcerpt && fetchedExcerpt.length > baseContent.length
            ? fetchedExcerpt
            : baseContent;

        const existing = await storage.getNewsByUrl(item.link);
        if (!existing) {
          await storage.createNews({
            title: item.title,
            description: item.contentSnippet || item.content || '',
            content: richContent,
            imageUrl: thumbnail,
            sourceName: feed.source,
            sourceUrl: item.link,
            category: feed.category,
            publishedAt,
          });
          count++;
        } else if ((!existing.imageUrl || isSourceLogoUrl(existing.imageUrl)) && thumbnail) {
          await storage.updateNewsImage(existing.id, thumbnail);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${feed.source}:`, err);
    }
  }
  return count;
}

export function setupCron() {
  cron.schedule('0 */5 * * *', async () => {
    console.log('Running scheduled news fetch (every 5 hours)...');
    await fetchNews();
  });
}
