import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
  normalizeText,
  computeKey,
  loadEnhancedCache,
  loadOverrides,
  loadGlossary,
  saveJSON,
  applyGlossary,
  shouldTranslate,
  determineContext,
  updateUsageStats
} from './cache-utils.js';

export class EnhancedTranslator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cache = loadEnhancedCache();
    this.overrides = loadOverrides();
    this.glossary = loadGlossary();
    this.pendingTranslations = new Map(); // lang -> Set of {key, text, context}
    this.currentPage = null;
    this.stats = {
      cacheHits: 0,
      apiCalls: 0,
      overrides: 0
    };
  }

  /**
   * Set current page for usage tracking
   */
  setCurrentPage(page) {
    this.currentPage = page;
  }

  /**
   * Get translation for a text string
   */
  async getTranslation(text, targetLang, context = 'general') {
    if (!shouldTranslate(text)) {
      return text;
    }

    const normalizedText = normalizeText(text);

    // 1. Apply glossary substitutions before anything else
    const glossaryApplied = applyGlossary(normalizedText, this.glossary);

    // 2. Check manual overrides first (highest priority)
    const overrideResult = this.checkOverrides(glossaryApplied, targetLang);
    if (overrideResult) {
      this.stats.overrides++;
      return overrideResult;
    }

    // 3. Generate cache key
    const key = computeKey(glossaryApplied, context);

    // 4. Check cache
    const cacheResult = this.checkCache(key, targetLang);
    if (cacheResult) {
      this.stats.cacheHits++;
      updateUsageStats(this.cache, key, this.currentPage);
      return cacheResult;
    }

    // 5. Queue for batch translation if not found
    this.queueForTranslation(key, glossaryApplied, targetLang, context);

    // Return original text for now - will be replaced after batch processing
    return glossaryApplied;
  }

  /**
   * Check manual overrides
   */
  checkOverrides(text, targetLang) {
    const langOverrides = this.overrides.overrides?.[targetLang];
    if (!langOverrides) return null;

    // Check direct match
    if (langOverrides[text]) {
      return langOverrides[text];
    }

    // Check case-insensitive match
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(langOverrides)) {
      if (key.toLowerCase() === lowerText) {
        return value;
      }
    }

    return null;
  }

  /**
   * Check cache for existing translation
   */
  checkCache(key, targetLang) {
    const item = this.cache.items[key];
    if (item && item.t && item.t[targetLang]) {
      return item.t[targetLang];
    }
    return null;
  }

  /**
   * Queue text for batch translation
   */
  queueForTranslation(key, text, targetLang, context) {
    if (!this.pendingTranslations.has(targetLang)) {
      this.pendingTranslations.set(targetLang, new Set());
    }

    this.pendingTranslations.get(targetLang).add({
      key,
      text,
      context
    });
  }

  /**
   * Process all pending translations in batches
   */
  async processPendingTranslations() {
    const results = new Map();

    for (const [lang, items] of this.pendingTranslations) {
      console.log(`🔄 Translating ${items.size} new strings to ${lang.toUpperCase()}`);

      const itemsArray = Array.from(items);
      const batchSize = 50; // DeepL can handle larger batches

      for (let i = 0; i < itemsArray.length; i += batchSize) {
        const batch = itemsArray.slice(i, i + batchSize);

        try {
          const translations = await this.translateBatch(
            batch.map(item => item.text),
            lang
          );

          // Store results
          batch.forEach((item, index) => {
            const translation = translations[index];
            if (translation) {
              // Update cache
              if (!this.cache.items[item.key]) {
                this.cache.items[item.key] = {
                  src: item.text,
                  t: {},
                  updated: new Date().toISOString(),
                  usage_count: 0,
                  pages: []
                };
              }

              this.cache.items[item.key].t[lang] = translation;
              this.cache.items[item.key].updated = new Date().toISOString();

              // Store for immediate use
              results.set(`${lang}:${item.text}`, translation);

              this.stats.apiCalls++;
            }
          });

        } catch (error) {
          console.error(`❌ Batch translation failed for ${lang}:`, error.message);

          // Fallback: use original text
          batch.forEach(item => {
            results.set(`${lang}:${item.text}`, item.text);
          });
        }

        // Small delay between batches to be API-friendly
        if (i + batchSize < itemsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Clear pending translations
    this.pendingTranslations.clear();

    return results;
  }

  /**
   * Translate a batch of texts using DeepL API
   */
  async translateBatch(texts, targetLang) {
    if (!this.apiKey) {
      console.warn('⚠️  No API key, using mock translations');
      return texts.map(text => `[${targetLang.toUpperCase()}] ${text}`);
    }

    try {
      const response = await fetch('https://api.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: texts.map(text => `text=${encodeURIComponent(text)}`).join('&') +
              `&target_lang=${targetLang.toUpperCase()}&source_lang=EN`
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.translations.map(t => t.text);

    } catch (error) {
      console.error(`❌ DeepL API error:`, error.message);
      throw error;
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache() {
    // Update stats
    this.cache.stats = {
      ...this.cache.stats,
      total_strings: Object.keys(this.cache.items).length,
      last_build: new Date().toISOString().split('T')[0],
      api_calls_saved: this.stats.cacheHits,
      cache_hits: this.stats.cacheHits,
      api_calls: this.stats.apiCalls,
      overrides_used: this.stats.overrides
    };

    const CACHE_FILE = path.join(__dirname, '../locales/cache.json');
    const success = saveJSON(CACHE_FILE, this.cache);
    if (success) {
      console.log(`💾 Cache saved: ${this.cache.stats.total_strings} strings, ${this.stats.cacheHits} hits, ${this.stats.apiCalls} API calls`);
    }
    return success;
  }

  /**
   * Get current translation statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalCached: Object.keys(this.cache.items).length,
      efficiency: this.stats.cacheHits + this.stats.apiCalls > 0
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.apiCalls) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Update DOM with final translations after batch processing
   */
  async updateDOMWithTranslations($, translationResults, targetLang) {
    // This method would be called after processPendingTranslations()
    // to replace any placeholder text with actual translations

    // Re-process elements that were queued for translation
    $('*').each((i, element) => {
      const el = $(element);
      const text = el.text();

      if (translationResults.has(`${targetLang}:${text}`)) {
        el.text(translationResults.get(`${targetLang}:${text}`));
      }

      // Handle attributes
      ['alt', 'title', 'placeholder', 'aria-label'].forEach(attr => {
        const value = el.attr(attr);
        if (value && translationResults.has(`${targetLang}:${value}`)) {
          el.attr(attr, translationResults.get(`${targetLang}:${value}`));
        }
      });
    });
  }
}
