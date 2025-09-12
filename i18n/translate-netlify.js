import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple configuration for Netlify
const CONFIG = {
  languages: ['fr', 'it', 'de'],
  priorityPages: [
    'index.html', 'contact.html', 'products.html', 'about.html',
    'walkway.html', 'baseplate.html', 'titan.html', 'edgebeams.html',
    'interlocking.html', 'connect.html', 'antitrespass.html',
    'link.html', 'accessories.html', 'thank-you.html'
  ]
};

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const CACHE_FILE = path.join(__dirname, '../locales/cache.json');
const SCHEMA_VERSION = 3; // Bump to invalidate old cache

// Stats tracking
let stats = {
  cacheHits: 0,
  cacheMisses: 0,
  apiCalls: 0,
  mockSkipped: 0
};

// Ensure locales directory exists
const localesDir = path.dirname(CACHE_FILE);
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

// Load cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    // Check schema version
    if (cacheData.schema === SCHEMA_VERSION) {
      cache = cacheData.translations || {};
      console.log(`📚 Loaded cache with ${Object.keys(cache).length} entries`);
    } else {
      console.log(`🔄 Cache schema outdated (${cacheData.schema} vs ${SCHEMA_VERSION}), starting fresh`);
    }
  } catch (e) {
    console.log('⚠️  Cache file corrupted, starting fresh');
  }
}

/**
 * Check if a string looks like a mock translation
 */
function looksMock(str) {
  return /^\s*\[(FR|IT|DE)\]/i.test(str);
}

/**
 * Simple translate function
 */
async function translate(text, targetLang) {
  if (!text || text.trim().length === 0) return text;
  
  const cacheKey = `${targetLang}:${text}`;
  if (cache[cacheKey]) {
    // Skip mock translations in cache
    if (looksMock(cache[cacheKey])) {
      stats.mockSkipped++;
      delete cache[cacheKey]; // Remove mock from cache
    } else {
      stats.cacheHits++;
      return cache[cacheKey];
    }
  }
  
  stats.cacheMisses++;
  
  if (!DEEPL_API_KEY) {
    console.log('⚠️  No API key, using mock translation');
    // Mock translation for testing
    const mockTranslation = `[${targetLang.toUpperCase()}] ${text}`;
    cache[cacheKey] = mockTranslation;
    return mockTranslation;
  }
  
  // Debug: Log first few translation attempts (remove later)
  // console.log(`🔍 Translating to ${targetLang}: "${text.substring(0, 50)}..."`)
  
  try {
    const response = await fetch('https://api.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `text=${encodeURIComponent(text)}&target_lang=${targetLang.toUpperCase()}&source_lang=EN`
    });

    if (!response.ok) {
      console.warn(`⚠️  API error: ${response.status}`);
      return text;
    }

    const data = await response.json();
    const translated = data.translations[0].text;
    
    stats.apiCalls++;
    
    // Never cache mock translations
    if (!looksMock(translated)) {
      cache[cacheKey] = translated;
    }
    return translated;
    
  } catch (error) {
    console.warn(`⚠️  Translation failed: ${error.message}`);
    return text;
  }
}

/**
 * Process a single HTML file
 */
async function processFile(sourceFile, targetLang) {
  console.log(`📄 Processing ${path.basename(sourceFile)} for ${targetLang}`);
  
  // Reset page-level stats
  const pageStats = {
    cacheHits: stats.cacheHits,
    apiCalls: stats.apiCalls
  };
  
  const html = fs.readFileSync(sourceFile, 'utf8');
  const $ = cheerio.load(html);
  const currentPageName = path.basename(sourceFile);
  
  let translationCount = 0;
  
  // Only translate if not English
  if (targetLang !== 'en') {
    
    // 1. Handle safe attributes first (these never break HTML structure)
    const attributeSelectors = [
      { selector: 'title', attr: 'text' },
      { selector: '[alt]', attr: 'alt' },
      { selector: '[placeholder]', attr: 'placeholder' },
      { selector: 'meta[name="description"]', attr: 'content' }
    ];
    
    for (const { selector, attr } of attributeSelectors) {
      const elements = $(selector).toArray();
      for (const element of elements) {
        const el = $(element);
        const value = attr === 'text' ? el.text() : el.attr(attr);
        if (value && value.length >= 3) {
          const translated = await translate(value, targetLang);
          if (attr === 'text') {
            el.text(translated);
          } else {
            el.attr(attr, translated);
          }
          translationCount++;
        }
      }
    }
    
    // 2. DOM-aware text node extraction for content elements
    const translatableTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'td', 'th', 'label', 'button', 'a', 'span', 'figcaption'];
    const skipClasses = ['icon', 'breadcrumb', 'pagination'];
    const skipAttributes = ['aria-hidden', 'data-', 'role'];
    
    let textsToTranslate = [];
    
    // Extract text nodes from translatable elements
    for (const tag of translatableTags) {
      const elements = $(tag).toArray();
      for (const element of elements) {
        const el = $(element);
        
        // Skip elements with certain classes or attributes
        const hasSkipClass = skipClasses.some(cls => el.hasClass(cls));
        const hasSkipAttr = skipAttributes.some(attr => 
          attr.endsWith('-') ? 
            Object.keys(el.get(0).attribs || {}).some(a => a.startsWith(attr)) :
            el.attr(attr)
        );
        
        if (hasSkipClass || hasSkipAttr) continue;
        
        // Get the direct text content (not nested element text)
        const textNodes = [];
        const contents = el.contents().toArray();
        for (const node of contents) {
          if (node.type === 'text') {
            const text = node.data.trim();
            if (text && text.length >= 3) {
              textNodes.push({ node, text });
            }
          }
        }
        
        // If element has only text nodes (no child elements with text), translate the whole element
        if (textNodes.length > 0 && el.children().length === 0) {
          const fullText = el.text().trim();
          if (fullText && fullText.length >= 3 && fullText.length < 500) {
            textsToTranslate.push({
              element: el,
              text: fullText,
              type: 'fullElement'
            });
          }
        }
        // For elements with mixed content, translate individual text nodes
        else if (textNodes.length > 0) {
          textNodes.forEach(({ node, text }) => {
            if (text.length >= 3 && text.length < 200) {
              textsToTranslate.push({
                node: node,
                text: text,
                type: 'textNode'
              });
            }
          });
        }
      }
    }
    
    
    // 3. Handle elements with specific classes that contain UI text
    const classBasedSelectors = [
      '*[class*="btn"]',     // Any element with "btn" in class name
      '*[class*="menu"]',    // Any element with "menu" in class name  
      '*[class*="caption"]', // Any element with "caption" in class name
      '*[class*="nav"]'      // Any element with "nav" in class name (but not if it has icon class)
    ];
    
    for (const selector of classBasedSelectors) {
      const elements = $(selector).toArray();
      for (const element of elements) {
        const el = $(element);
        
        // Skip if it has excluded classes
        const hasSkipClass = skipClasses.some(cls => el.hasClass(cls));
        if (hasSkipClass) continue;
        
        // Only process elements with simple text content (no complex children)
        if (el.children().filter(':not(span)').length === 0) {
          const text = el.text().trim();
          if (text && text.length >= 2 && text.length < 100 && 
              !text.match(/^[0-9\s\-\+\*\/%=<>!@#$%^&*(){}[\]|\\:;",.<>?`~_]+$/)) {
            textsToTranslate.push({
              element: el,
              text: text,
              type: 'fullElement'
            });
          }
        }
      }
    }
    
    // 4. Handle additional attributes that may contain translatable text
    const attributeElements = [
      { selector: '[title]', attr: 'title' },
      { selector: 'img[alt]', attr: 'alt' },
      { selector: 'input[placeholder]', attr: 'placeholder' },
      { selector: 'button[aria-label]', attr: 'aria-label' }
    ];
    
    for (const { selector, attr } of attributeElements) {
      const elements = $(selector).toArray();
      for (const element of elements) {
        const el = $(element);
        const value = el.attr(attr);
        if (value && value.length >= 3 && value.length < 100) {
          textsToTranslate.push({
            element: el,
            text: value,
            type: 'attribute',
            attr: attr
          });
        }
      }
    }
    
    // Now translate all collected texts (including the new ones)
    for (const item of textsToTranslate) {
      const translated = await translate(item.text, targetLang);
      
      if (item.type === 'fullElement') {
        item.element.text(translated);
      } else if (item.type === 'textNode') {
        item.node.data = translated;
      } else if (item.type === 'attribute') {
        item.element.attr(item.attr, translated);
      }
      
      translationCount++;
      
      // Rate limiting
      if (translationCount % 10 === 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }
  
  // Add integrated language switcher to navigation
  const currentLang = targetLang.toUpperCase();
  
  // Desktop navigation dropdown (after contact button)
  const desktopSwitcher = `
    <li class="language-switcher-desktop">
      <a href="#" class="language-dropdown-toggle" id="lang-toggle">
        ${currentLang} <span class="dropdown-arrow">▼</span>
      </a>
      <div class="language-dropdown" id="lang-dropdown">
        <a href="/${currentPageName}" class="lang-option ${targetLang === 'en' ? 'active' : ''}">EN</a>
        <a href="/fr/${currentPageName}" class="lang-option ${targetLang === 'fr' ? 'active' : ''}">FR</a>
        <a href="/it/${currentPageName}" class="lang-option ${targetLang === 'it' ? 'active' : ''}">IT</a>
        <a href="/de/${currentPageName}" class="lang-option ${targetLang === 'de' ? 'active' : ''}">DE</a>
      </div>
    </li>
  `;
  
  // Mobile menu horizontal buttons (after contact button)
  const mobileSwitcher = `
    <div class="language-switcher-mobile">
      <div class="mobile-lang-buttons">
        <a href="/${currentPageName}" class="mobile-lang-btn ${targetLang === 'en' ? 'active' : ''}">EN</a>
        <a href="/fr/${currentPageName}" class="mobile-lang-btn ${targetLang === 'fr' ? 'active' : ''}">FR</a>
        <a href="/it/${currentPageName}" class="mobile-lang-btn ${targetLang === 'it' ? 'active' : ''}">IT</a>
        <a href="/de/${currentPageName}" class="mobile-lang-btn ${targetLang === 'de' ? 'active' : ''}">DE</a>
      </div>
    </div>
  `;
  
  // Insert desktop switcher after the last nav-menu item
  $('.nav-menu').append(desktopSwitcher);
  
  // Insert mobile switcher after the contact button in mobile menu
  $('.mobile-nav-menu .contact-btn').after(mobileSwitcher);
  
  // Add CSS styles for language switcher
  const languageSwitcherCSS = `
    <style>
      /* Desktop Language Switcher */
      .language-switcher-desktop {
        position: relative;
      }
      
      .language-dropdown-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.9rem;
        padding: 8px 16px;
        color: white !important;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.3s ease;
        border-radius: 6px;
      }
      
      .language-dropdown-toggle:hover {
        background: rgba(255, 107, 53, 0.15) !important;
        color: #ff6b35 !important;
      }
      
      .language-dropdown-toggle .dropdown-arrow {
        font-size: 0.7em;
        transition: transform 0.3s ease;
      }
      
      .language-switcher-desktop:hover .dropdown-arrow {
        transform: rotate(180deg);
      }
      
      .language-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: white !important;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 8px 0;
        min-width: 120px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        z-index: 10000 !important;
        margin-top: 8px;
      }
      
      .language-switcher-desktop:hover .language-dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .lang-option {
        display: block;
        padding: 8px 16px;
        color: #475569 !important;
        background: transparent !important;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
        transition: all 0.2s ease;
      }
      
      .lang-option:hover {
        background: #f8fafc;
        color: #ff6b35 !important;
      }
      
      .language-switcher-desktop .language-dropdown .lang-option.active {
        background: #ff6b35 !important;
        color: white !important;
        font-weight: 600;
        text-decoration: none !important;
      }
      
      /* Override any conflicting styles */
      .language-dropdown a.lang-option.active {
        background: #ff6b35 !important;
        color: white !important;
      }
      
      /* Mobile Language Switcher */
      .language-switcher-mobile {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      
      .mobile-lang-buttons {
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }
      
      .mobile-lang-btn {
        flex: 1;
        text-align: center;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .mobile-lang-btn:hover {
        background: rgba(255, 107, 53, 0.3);
        border-color: #ff6b35;
      }
      
      .mobile-lang-btn.active {
        background: #ff6b35;
        border-color: #ff6b35;
        color: white !important;
        box-shadow: 0 2px 8px rgba(255,107,53,0.3);
      }
      
      /* Hide desktop switcher on mobile */
      @media (max-width: 900px) {
        .language-switcher-desktop {
          display: none;
        }
      }
      
      /* Hide mobile switcher on desktop */
      @media (min-width: 901px) {
        .language-switcher-mobile {
          display: none;
        }
      }
      
      /* Responsive adjustments for smaller desktop screens */
      @media (max-width: 1024px) {
        .language-dropdown-toggle {
          padding: 5px 12px;
          font-size: 0.85rem;
        }
      }
    </style>
  `;
  
  // Add JavaScript for dropdown functionality
  const languageSwitcherJS = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Handle dropdown toggle click (prevent default navigation)
        const dropdownToggle = document.getElementById('lang-toggle');
        if (dropdownToggle) {
          dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
          });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
          const switcher = document.querySelector('.language-switcher-desktop');
          if (switcher && !switcher.contains(event.target)) {
            // Optional: Could add active class management here if needed
          }
        });
        
        // Close mobile menu when language is selected
        const mobileLangBtns = document.querySelectorAll('.mobile-lang-btn');
        mobileLangBtns.forEach(btn => {
          btn.addEventListener('click', function() {
            const mobileToggle = document.getElementById('mobile-toggle');
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileToggle && mobileMenu) {
              mobileToggle.classList.remove('active');
              mobileMenu.classList.remove('active');
            }
          });
        });
      });
    </script>
  `;
  
  // Add CSS and JS to the head
  $('head').append(languageSwitcherCSS);
  $('body').append(languageSwitcherJS);
  
  // Rail site: favicon paths are already correct, no modification needed
  // $('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').each(function() {
  //   const currentHref = $(this).attr('href');
  //   if (currentHref && currentHref.startsWith('favicon_io/')) {
  //     $(this).attr('href', `src/assets/${currentHref}`);
  //   }
  // });
  
  // Rail site: PDF paths are already correct, no modification needed
  // $('a[href$=".pdf"]').each(function() {
  //   const currentHref = $(this).attr('href');
  //   if (currentHref && !currentHref.startsWith('http') && !currentHref.startsWith('/') && !currentHref.startsWith('src/assets/')) {
  //     $(this).attr('href', `src/assets/${currentHref}`);
  //   }
  // });
  
  // Fix image paths and add performance hints
  $('img[src]').each(function() {
    const currentSrc = $(this).attr('src');
    // Skip if already has correct path or is external URL or starts with /
    // Rail site: image paths are already correct, no modification needed
    // if (!currentSrc.startsWith('src/assets/') && 
    //     !currentSrc.startsWith('http') && 
    //     !currentSrc.startsWith('//') &&
    //     !currentSrc.startsWith('/') &&
    //     !currentSrc.startsWith('data:') &&
    //     !currentSrc.includes('favicon')) {
    //   $(this).attr('src', `src/assets/${currentSrc}`);
    // }
    
    // Add performance optimizations
    if (!$(this).attr('loading')) {
      $(this).attr('loading', 'lazy');
    }
    if (!$(this).attr('decoding')) {
      $(this).attr('decoding', 'async');
    }
  });
  
  // Fix source elements srcset attributes
  $('source[srcset]').each(function() {
    const currentSrcset = $(this).attr('srcset');
    // Rail site: srcset paths are already correct, no modification needed
    // if (!currentSrcset.startsWith('src/assets/') && 
    //     !currentSrcset.startsWith('http') && 
    //     !currentSrcset.startsWith('//') &&
    //     !currentSrcset.startsWith('/') &&
    //     !currentSrcset.includes('favicon')) {
    //   $(this).attr('srcset', `src/assets/${currentSrcset}`);
    // }
  });
  
  // Fix background images in style attributes
  $('[style*="background-image"]').each(function() {
    const style = $(this).attr('style');
    // Rail site: background image paths are already correct, no modification needed
    // if (style && style.includes('url(') && !style.includes('src/assets/')) {
    //   const updatedStyle = style.replace(/url\(['"]?([^'"()]+)['"]?\)/g, (match, imagePath) => {
    //     if (!imagePath.startsWith('src/assets/') && 
    //         !imagePath.startsWith('http') && 
    //         !imagePath.startsWith('//') &&
    //         !imagePath.startsWith('/')) {
    //       return `url('src/assets/${imagePath}')`;
    //     }
    //     return match;
    //   });
    //   $(this).attr('style', updatedStyle);
    // }
  });
  
  // Fix CSS background images in style tags
  $('style').each(function() {
    const cssContent = $(this).html();
    if (cssContent && cssContent.includes('url(')) {
      // Rail site: CSS background paths are already correct, no modification needed
      // const updatedCSS = cssContent.replace(/url\(['"]?([^'"()]+)['"]?\)/g, (match, imagePath) => {
      //   if (!imagePath.startsWith('src/assets/') && 
      //       !imagePath.startsWith('http') && 
      //       !imagePath.startsWith('//') &&
      //       !imagePath.startsWith('/') &&
      //       !imagePath.includes('data:') &&
      //       !imagePath.includes('favicon')) {
      //     return `url('src/assets/${imagePath}')`;
      //   }
      //   return match;
      // });
      // $(this).html(updatedCSS);
    }
  });
  
  // Add hreflang tags
  if ($('link[rel="alternate"][hreflang]').length === 0) {
    $('head').append(`
      <link rel="alternate" hreflang="en" href="/en/">
      <link rel="alternate" hreflang="fr" href="/fr/">
      <link rel="alternate" hreflang="de" href="/de/">
      <link rel="alternate" hreflang="es" href="/es/">
    `);
  }
  
  const pageHits = stats.cacheHits - pageStats.cacheHits;
  const pageAPICalls = stats.apiCalls - pageStats.apiCalls;
  console.log(`  ✓ Translated ${translationCount} items (hits: ${pageHits}, API calls: ${pageAPICalls})`);  
  
  return $.html();
}

/**
 * Copy assets to language directories
 */
function copyAssets() {
  // For Rail site, copy image and asset files from root to all language directories
  console.log('📁 Copying Rail assets from root directory...');
  
  const rootDir = path.join(__dirname, '../dist');
  const sourceDir = path.join(__dirname, '../');
  
  // Common asset file extensions for Rail (explicitly exclude HTML)
  const assetExtensions = ['.avif', '.webp', '.jpg', '.png', '.pdf', '.svg'];
  const excludeExtensions = ['.html', '.htm'];
  
  // Get all files in source directory
  const allFiles = fs.readdirSync(sourceDir);
  const assetFiles = allFiles.filter(file => {
    const lowerFile = file.toLowerCase();
    // Include if it has an asset extension and NOT an excluded extension
    return assetExtensions.some(ext => lowerFile.endsWith(ext)) &&
           !excludeExtensions.some(ext => lowerFile.endsWith(ext));
  });
  
  console.log(`Found ${assetFiles.length} asset files to copy`);
  
  // Copy favicon directory
  const faviconSource = path.join(sourceDir, 'favicon_io');
  if (fs.existsSync(faviconSource)) {
    // Copy to root
    const rootFaviconTarget = path.join(rootDir, 'favicon_io');
    if (!fs.existsSync(rootFaviconTarget)) {
      fs.cpSync(faviconSource, rootFaviconTarget, { recursive: true });
    }
    
    // Copy to each language directory
    CONFIG.languages.forEach(lang => {
      const langFaviconTarget = path.join(rootDir, lang, 'favicon_io');
      if (!fs.existsSync(langFaviconTarget)) {
        fs.cpSync(faviconSource, langFaviconTarget, { recursive: true });
      }
    });
    console.log('✓ Copied favicon_io directory');
  }
  
  // Copy individual asset files
  assetFiles.forEach(file => {
    const source = path.join(sourceDir, file);
    
    // Copy to root
    const rootTarget = path.join(rootDir, file);
    if (!fs.existsSync(rootTarget)) {
      fs.copyFileSync(source, rootTarget);
    }
    
    // Copy to each language directory
    CONFIG.languages.forEach(lang => {
      const langTarget = path.join(rootDir, lang, file);
      if (!fs.existsSync(langTarget)) {
        fs.copyFileSync(source, langTarget);
      }
    });
  });
  
  console.log(`✓ Copied ${assetFiles.length} asset files to all directories`);
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Starting Netlify-optimized translation build\n');
  console.log(`API Key: ${DEEPL_API_KEY ? 'SET ✓' : 'NOT SET ⚠️'}`);
  console.log(`Languages: ${CONFIG.languages.join(', ')}`);
  console.log(`Priority pages: ${CONFIG.priorityPages.join(', ')}\n`);
  
  console.log('📁 Checking source directory...');
  const sourceDir = path.join(__dirname, '../');
  console.log(`Source directory: ${sourceDir}`);
  
  // Create language directories at root level for Netlify
  const rootDir = path.join(__dirname, '../dist');
  
  // Clear and recreate dist directory
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }
  fs.mkdirSync(rootDir, { recursive: true });
  
  // Create language directories (no /en/ directory - English at root)
  CONFIG.languages.forEach(lang => {
    const langDir = path.join(rootDir, lang);
    fs.mkdirSync(langDir, { recursive: true });
  });
  
  // Copy assets first
  console.log('📁 Copying assets...');
  copyAssets();
  
  // Process each priority page
  
  for (const pageFile of CONFIG.priorityPages) {
    const sourcePath = path.join(sourceDir, pageFile);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  ${pageFile} not found`);
      continue;
    }
    
    // English will be processed directly to root in the separate section below
    
    // Process translations
    for (const lang of CONFIG.languages) {
      const translatedHTML = await processFile(sourcePath, lang);
      const targetPath = path.join(rootDir, lang, pageFile);
      fs.writeFileSync(targetPath, translatedHTML);
      
      // Save cache with schema after each file
      const cacheData = {
        schema: SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        stats: {
          totalEntries: Object.keys(cache).length,
          lastCacheHits: stats.cacheHits,
          lastApiCalls: stats.apiCalls,
          lastMockSkipped: stats.mockSkipped
        },
        translations: cache
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    }
  }
  
  // Copy config files to root and language directories
  console.log('\n📋 Copying config files...');
  const configFiles = ['robots.txt', 'netlify.toml', '_redirects'];
  
  configFiles.forEach(file => {
    const source = path.join(__dirname, '..', file);
    if (fs.existsSync(source)) {
      // Copy to root directory
      const rootTarget = path.join(rootDir, file);
      fs.copyFileSync(source, rootTarget);
      
      // Copy to each language directory (no /en/ - English at root)
      CONFIG.languages.forEach(lang => {
        const target = path.join(rootDir, lang, file);
        fs.copyFileSync(source, target);
      });
      console.log(`✓ Copied ${file} to root and all language directories`);
    }
  });
  
  // Copy English content directly to root (no /en/ subdirectory)
  console.log('\n📋 Copying English content to root...');
  
  // Process each priority page and copy English version to root
  for (const pageFile of CONFIG.priorityPages) {
    const sourcePath = path.join(sourceDir, pageFile);
    
    if (fs.existsSync(sourcePath)) {
      console.log(`📄 Processing ${pageFile} for root (English)`);
      const englishHTML = await processFile(sourcePath, 'en');
      const rootPath = path.join(rootDir, pageFile);
      fs.writeFileSync(rootPath, englishHTML);
      console.log(`✓ Copied English ${pageFile} to root`);
    }
  }
  
  console.log('✓ English content served directly at root (no redirect)');
  
  // Validation: Check for mock translations in output
  console.log('\n🔍 Validating output for mock translations...');
  let mockFound = false;
  for (const lang of CONFIG.languages) {
    for (const pageFile of CONFIG.priorityPages) {
      const filePath = path.join(rootDir, lang, pageFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.match(/\[(FR|IT|DE)\]/)) {
          console.error(`❌ Mock translation marker found in ${lang}/${pageFile}`);
          mockFound = true;
        }
      }
    }
  }
  
  if (mockFound) {
    console.error('\n❌ Build failed: Mock translation markers found in output');
    console.error('This usually means the DeepL API key is not set or not working');
    process.exit(1);
  } else {
    console.log('✅ No mock translations found in output');
  }
  
  // Final summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ Build complete in ${elapsed}s`);
  console.log(`📁 Output: dist/ (root=EN), dist/{${CONFIG.languages.join(',')}}/ `);
  console.log(`📊 Stats: ${stats.cacheHits} cache hits, ${stats.apiCalls} API calls, ${stats.mockSkipped} mocks skipped`);
  
  // Clean up any mistakenly created HTML directories
  console.log('\n🧹 Cleaning up any HTML directories...');
  try {
    const distContents = fs.readdirSync(rootDir);
    distContents.forEach(item => {
      if (item.endsWith('.html') || item.endsWith('.htm')) {
        const itemPath = path.join(rootDir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          fs.rmSync(itemPath, { recursive: true });
          console.log(`  Removed directory: ${item}/`);
        }
      }
    });
  } catch (e) {
    console.log(`  Error during cleanup: ${e.message}`);
  }
  
  // Show final structure
  console.log('\n📋 Final directory structure:');
  try {
    const distContents = fs.readdirSync(rootDir);
    distContents.forEach(dir => {
      const dirPath = path.join(rootDir, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        console.log(`  ${dir}/`);
        const files = fs.readdirSync(dirPath).slice(0, 5); // Show first 5 files
        files.forEach(file => {
          console.log(`    ${file}`);
        });
        const totalFiles = fs.readdirSync(dirPath).length;
        if (totalFiles > 5) {
          console.log(`    ... and ${totalFiles - 5} more files`);
        }
      } else {
        console.log(`  ${dir}`);
      }
    });
  } catch (e) {
    console.log(`  Error reading dist: ${e.message}`);
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };