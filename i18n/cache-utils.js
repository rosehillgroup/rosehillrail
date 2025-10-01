import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCHEMA_VERSION = 2;
const GLOSSARY_VERSION = 1;

// File paths
const CACHE_FILE = path.join(__dirname, '../locales/cache.json');
const OVERRIDES_FILE = path.join(__dirname, '../locales/overrides.json');
const GLOSSARY_FILE = path.join(__dirname, '../locales/glossary.json');
const PAGES_FILE = path.join(__dirname, '../locales/pages.json');

/**
 * Normalize text for consistent hashing
 */
export function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '"')
    .replace(/[…]/g, '...');
}

/**
 * Compute deterministic hash key for a string
 */
export function computeKey(text, context = 'general') {
  const normalized = normalizeText(text);
  const keyString = `${normalized}|schema:${SCHEMA_VERSION}|glossary:${GLOSSARY_VERSION}|context:${context}`;
  return crypto.createHash('sha256').update(keyString, 'utf8').digest('hex').substring(0, 16);
}

/**
 * Compute page fingerprint
 */
export function computePageHash(content) {
  // Normalize HTML content for consistent hashing
  const normalized = content
    .replace(/\s+/g, ' ')
    .replace(/<!--.*?-->/gs, '')
    .trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Load JSON file with error handling
 */
export function loadJSON(filepath, defaultValue = {}) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (error) {
    console.warn(`⚠️  Failed to load ${filepath}: ${error.message}`);
  }
  return defaultValue;
}

/**
 * Save JSON file atomically
 */
export function saveJSON(filepath, data) {
  try {
    const tempFile = `${filepath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, filepath);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save ${filepath}: ${error.message}`);
    return false;
  }
}

/**
 * Load enhanced cache structure
 */
export function loadEnhancedCache() {
  const cache = loadJSON(CACHE_FILE, {
    schema: SCHEMA_VERSION,
    glossary_version: GLOSSARY_VERSION,
    stats: {
      total_strings: 0,
      last_build: new Date().toISOString().split('T')[0],
      api_calls_saved: 0,
      build_time_saved: 0
    },
    items: {}
  });

  // Ensure structure is correct
  if (!cache.items) cache.items = {};
  if (!cache.stats) {
    cache.stats = {
      total_strings: 0,
      last_build: new Date().toISOString().split('T')[0],
      api_calls_saved: 0,
      build_time_saved: 0
    };
  }

  return cache;
}

/**
 * Load translation overrides
 */
export function loadOverrides() {
  return loadJSON(OVERRIDES_FILE, { overrides: {} });
}

/**
 * Load glossary
 */
export function loadGlossary() {
  return loadJSON(GLOSSARY_FILE, {});
}

/**
 * Load pages manifest
 */
export function loadPages() {
  return loadJSON(PAGES_FILE, {});
}

/**
 * Apply glossary substitutions to text before translation
 */
export function applyGlossary(text, glossary) {
  let result = text;
  for (const [term, replacement] of Object.entries(glossary)) {
    // Case-insensitive replacement but preserve original case
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }
  return result;
}

/**
 * Check if text should be translated (not just numbers, symbols, etc.)
 */
export function shouldTranslate(text) {
  if (!text || text.length < 2) return false;

  // Skip if mostly numbers, symbols, or very short
  if (text.match(/^[0-9\s\-\+\*\/%=<>!@#$%^&*(){}[\]|\\:;",.<>?`~_]+$/)) return false;

  // Skip if it looks like code or technical identifiers
  if (text.match(/^[A-Z0-9_-]+$/) && text.length < 10) return false;

  return true;
}

/**
 * Determine context from element information
 */
export function determineContext(element, attribute = null) {
  if (attribute) {
    return `attr-${attribute}`;
  }

  if (!element) return 'general';

  const tagName = element.tagName?.toLowerCase() || '';
  const className = element.className || '';

  // Button context
  if (tagName === 'button' || className.includes('btn')) return 'button';

  // Navigation context
  if (className.includes('nav') || className.includes('menu')) return 'nav';

  // Heading context
  if (tagName.match(/^h[1-6]$/)) return 'heading';

  // Form context
  if (['label', 'input', 'textarea', 'select'].includes(tagName)) return 'form';

  // Footer context
  if (className.includes('footer')) return 'footer';

  return 'general';
}

/**
 * Migrate old flat cache to new structure
 */
export function migrateOldCache(oldCache) {
  const newCache = loadEnhancedCache();
  let migratedCount = 0;

  console.log('🔄 Migrating old cache format to enhanced structure...');

  for (const [oldKey, translation] of Object.entries(oldCache)) {
    // Parse old key format: "lang:text"
    const match = oldKey.match(/^([a-z]{2}):(.+)$/);
    if (!match) continue;

    const [, lang, sourceText] = match;
    const key = computeKey(sourceText);

    // Initialize cache item if it doesn't exist
    if (!newCache.items[key]) {
      newCache.items[key] = {
        src: sourceText,
        t: {},
        updated: new Date().toISOString(),
        usage_count: 1,
        pages: []
      };
    }

    // Add translation
    newCache.items[key].t[lang] = translation;
    migratedCount++;
  }

  newCache.stats.total_strings = Object.keys(newCache.items).length;
  console.log(`✅ Migrated ${migratedCount} translations to enhanced cache`);

  return newCache;
}

/**
 * Update usage statistics for a cache item
 */
export function updateUsageStats(cache, key, page) {
  if (cache.items[key]) {
    cache.items[key].usage_count = (cache.items[key].usage_count || 0) + 1;
    if (page && !cache.items[key].pages.includes(page)) {
      cache.items[key].pages.push(page);
    }
  }
}

/**
 * Get statistics about cache efficiency
 */
export function getCacheStats(cache) {
  const items = Object.values(cache.items);
  const totalStrings = items.length;
  const totalUsage = items.reduce((sum, item) => sum + (item.usage_count || 0), 0);
  const unusedStrings = items.filter(item => (item.usage_count || 0) === 0).length;

  return {
    total_strings: totalStrings,
    total_usage: totalUsage,
    unused_strings: unusedStrings,
    efficiency: totalStrings > 0 ? ((totalStrings - unusedStrings) / totalStrings * 100).toFixed(1) : 0
  };
}
