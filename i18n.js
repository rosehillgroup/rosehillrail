/**
 * Rosehill Rail Internationalization Library
 * Supports English, French, Italian, and German
 * 2025
 */

class RosehillI18n {
    constructor() {
        this.currentLanguage = 'en';
        this.defaultLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = ['en', 'fr', 'it', 'de'];
        this.rtlLanguages = [];
        this.isLoaded = false;

        // URL configuration - simpler for Rail (no language prefix in URL)
        this.urlConfig = {
            baseUrl: window.location.origin,
            languagePrefix: false, // Don't use /en/, /fr/, etc.
            defaultLanguageInUrl: false
        };

        // Performance optimizations
        this.translationCache = new Map();
        this.loadedLanguages = new Set();
        this.pendingLoads = new Map();
    }

    async init() {
        // Detect language from localStorage or browser
        this.detectLanguage();

        // Load translations
        await this.loadTranslations();

        // Apply language
        this.applyLanguage();

        // Initialize language switcher
        this.initLanguageSwitcher();

        // Inject hreflang tags for SEO
        this.injectHreflangTags();

        this.isLoaded = true;
        this.dispatchEvent('i18nLoaded');
    }

    detectLanguage() {
        // Priority 1: Check URL query parameter (from Netlify rewrite)
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLanguages.includes(urlLang)) {
            this.currentLanguage = urlLang;
            localStorage.setItem('rosehill_rail_language', urlLang);
            return;
        }

        // Priority 2: Check URL path for language prefix (direct navigation)
        const pathLang = this.getLanguageFromPath();
        if (pathLang) {
            this.currentLanguage = pathLang;
            localStorage.setItem('rosehill_rail_language', pathLang);
            return;
        }

        // Priority 3: Check localStorage
        const savedLang = localStorage.getItem('rosehill_rail_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
            return;
        }

        // Priority 4: Default to English for new visitors
        this.currentLanguage = this.defaultLanguage;
    }

    getLanguageFromPath() {
        const path = window.location.pathname;
        const match = path.match(/^\/(fr|it|de)\//);
        return match ? match[1] : null;
    }

    getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        return lang ? lang.substring(0, 2) : null;
    }

    async loadTranslations() {
        // Check if already loaded
        if (this.loadedLanguages.has(this.currentLanguage)) {
            this.translations = this.translationCache.get(this.currentLanguage);
            return;
        }

        // Check if already loading
        if (this.pendingLoads.has(this.currentLanguage)) {
            await this.pendingLoads.get(this.currentLanguage);
            this.translations = this.translationCache.get(this.currentLanguage);
            return;
        }

        // Start loading
        const loadPromise = this.fetchTranslations(this.currentLanguage);
        this.pendingLoads.set(this.currentLanguage, loadPromise);

        try {
            this.translations = await loadPromise;
            this.translationCache.set(this.currentLanguage, this.translations);
            this.loadedLanguages.add(this.currentLanguage);
        } catch (error) {
            console.error('Failed to load translations:', error);

            // Fallback to English if current language fails
            if (this.currentLanguage !== this.defaultLanguage) {
                this.currentLanguage = this.defaultLanguage;

                if (!this.loadedLanguages.has(this.defaultLanguage)) {
                    const fallbackPromise = this.fetchTranslations(this.defaultLanguage);
                    this.translations = await fallbackPromise;
                    this.translationCache.set(this.defaultLanguage, this.translations);
                    this.loadedLanguages.add(this.defaultLanguage);
                } else {
                    this.translations = this.translationCache.get(this.defaultLanguage);
                }
            }
        } finally {
            this.pendingLoads.delete(this.currentLanguage);
        }
    }

    async fetchTranslations(language) {
        const cacheBuster = Date.now();
        const response = await fetch(`/languages/${language}.json?v=${cacheBuster}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${language}`);
        }
        return await response.json();
    }

    applyLanguage() {
        // Update document language attributes
        document.documentElement.lang = this.currentLanguage;
        document.documentElement.dir = this.translations.meta.dir;

        // Update all translatable elements
        this.updateTranslatableElements();

        // Update meta tags
        this.updateMetaTags();

        // Update forms
        this.updateForms();

        // Update language switcher display
        this.updateLanguageSwitcherDisplay();

        // Update navigation links to preserve language prefix
        this.updateNavigationLinks();
    }

    updateTranslatableElements() {
        // Update text content elements
        const elements = document.querySelectorAll('[data-i18n]');
        const updates = [];

        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.get(key);

            if (translation && element.textContent !== translation) {
                updates.push({ element, translation });
            }
        });

        // Apply updates in a single batch to minimize reflows
        if (updates.length > 0) {
            requestAnimationFrame(() => {
                updates.forEach(({ element, translation }) => {
                    element.innerHTML = translation;
                });
            });
        }

        // Update elements with data-i18n-attr (for attributes)
        const attrElements = document.querySelectorAll('[data-i18n-attr]');
        const attrUpdates = [];

        attrElements.forEach(element => {
            const attrConfig = element.getAttribute('data-i18n-attr');
            try {
                const config = JSON.parse(attrConfig);
                Object.entries(config).forEach(([attr, key]) => {
                    const translation = this.get(key);
                    if (translation && element.getAttribute(attr) !== translation) {
                        attrUpdates.push({ element, attr, translation });
                    }
                });
            } catch (error) {
                console.error('Error parsing data-i18n-attr:', error);
            }
        });

        // Apply attribute updates
        if (attrUpdates.length > 0) {
            requestAnimationFrame(() => {
                attrUpdates.forEach(({ element, attr, translation }) => {
                    element.setAttribute(attr, translation);
                });
            });
        }
    }

    updateMetaTags() {
        // Update page title
        const titleElement = document.querySelector('title');
        if (titleElement && titleElement.hasAttribute('data-i18n')) {
            const key = titleElement.getAttribute('data-i18n');
            const translation = this.get(key);
            if (translation) {
                titleElement.textContent = translation;
            }
        }

        // Update meta description
        const descElement = document.querySelector('meta[name="description"]');
        if (descElement && descElement.hasAttribute('data-i18n')) {
            const key = descElement.getAttribute('data-i18n');
            const translation = this.get(key);
            if (translation) {
                descElement.setAttribute('content', translation);
            }
        }
    }

    updateForms() {
        // Update form labels and placeholders
        const formElements = document.querySelectorAll('input, textarea, select, label');
        formElements.forEach(element => {
            if (element.hasAttribute('data-i18n-placeholder')) {
                const key = element.getAttribute('data-i18n-placeholder');
                const translation = this.get(key);
                if (translation) {
                    element.setAttribute('placeholder', translation);
                }
            }
        });
    }

    get(key) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }

        return value;
    }

    async changeLanguage(newLanguage) {
        if (!this.supportedLanguages.includes(newLanguage)) {
            return;
        }

        if (newLanguage === this.currentLanguage) {
            return;
        }

        // Build new URL with language prefix and navigate
        const newUrl = this.buildLanguageUrl(newLanguage);

        // Save preference before navigation
        localStorage.setItem('rosehill_rail_language', newLanguage);

        // Navigate to new URL (this will reload page with correct language)
        window.location.href = newUrl;
    }

    buildLanguageUrl(language) {
        // Get current path without query params
        const currentPath = window.location.pathname;

        // Remove any existing language prefix
        const cleanPath = currentPath.replace(/^\/(fr|it|de)\//, '/');

        // Get just the filename
        let fileName = cleanPath.split('/').pop();
        if (!fileName || fileName === '') {
            fileName = 'index.html';
        }

        // Build new URL with language prefix
        if (language === 'en') {
            // English - no prefix, root level
            return `/${fileName}`;
        } else {
            // Other languages - add prefix
            return `/${language}/${fileName}`;
        }
    }

    initLanguageSwitcher() {
        // Add event listeners to existing language switcher buttons
        this.addLanguageSwitcherEvents();
    }

    addLanguageSwitcherEvents() {
        const options = document.querySelectorAll('[data-language]');

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const language = option.getAttribute('data-language');
                this.changeLanguage(language);
            });
        });
    }

    updateLanguageSwitcherDisplay() {
        // Update desktop language switcher text
        const desktopToggle = document.querySelector('.language-dropdown-toggle, #lang-toggle');
        if (desktopToggle) {
            const arrow = desktopToggle.querySelector('.dropdown-arrow');
            const arrowText = arrow ? arrow.outerHTML : '';
            desktopToggle.innerHTML = `${this.currentLanguage.toUpperCase()} ${arrowText}`;
        }

        // Update hrefs and active states on all language options
        document.querySelectorAll('[data-language]').forEach(option => {
            const lang = option.getAttribute('data-language');

            // Update href to point to correct language URL
            const languageUrl = this.buildLanguageUrl(lang);
            option.setAttribute('href', languageUrl);

            // Update active state
            if (lang === this.currentLanguage) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    updateNavigationLinks() {
        console.log('[i18n] updateNavigationLinks() called');
        console.log('[i18n] this.currentLanguage:', this.currentLanguage);

        // Use the already-detected current language
        // Note: We can't use getLanguageFromPath() because edge function rewrites
        // the pathname server-side, so window.location.pathname shows the rewritten path
        const currentLang = this.currentLanguage;

        // Only update links if we're not on English
        if (!currentLang || currentLang === 'en') {
            console.log('[i18n] Skipping link updates - language is', currentLang);
            return;
        }

        // Get all links on the page
        const links = document.querySelectorAll('a[href]');
        console.log('[i18n] Found', links.length, 'total links on page');

        let updatedCount = 0;
        let skippedCount = 0;

        links.forEach(link => {
            const href = link.getAttribute('href');

            // Skip if:
            // - No href
            // - External link (starts with http/https)
            // - Anchor link (starts with #)
            // - Already has language prefix
            // - Not an HTML file
            // - Data/javascript protocol
            if (!href ||
                href.startsWith('http://') ||
                href.startsWith('https://') ||
                href.startsWith('#') ||
                href.startsWith(`/${currentLang}/`) ||
                href.startsWith('javascript:') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                !href.endsWith('.html')) {
                skippedCount++;
                return;
            }

            // Skip language switcher links (they have data-language attribute)
            if (link.hasAttribute('data-language')) {
                skippedCount++;
                return;
            }

            // Remove leading slash if present
            const cleanHref = href.startsWith('/') ? href.substring(1) : href;

            // Prepend language prefix
            const newHref = `/${currentLang}/${cleanHref}`;
            link.setAttribute('href', newHref);
            updatedCount++;

            if (updatedCount <= 5) {
                console.log(`[i18n] Updated: "${href}" → "${newHref}"`);
            }
        });

        console.log(`[i18n] Links updated: ${updatedCount}, skipped: ${skippedCount}`);
    }

    injectHreflangTags() {
        // Remove any existing hreflang tags first
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(tag => tag.remove());

        // Get current page filename
        const currentPath = window.location.pathname;
        const cleanPath = currentPath.replace(/^\/(fr|it|de)\//, '/');
        let fileName = cleanPath.split('/').pop();
        if (!fileName || fileName === '') {
            fileName = 'index.html';
        }

        const baseUrl = window.location.origin;
        const head = document.head;

        // Add hreflang for each language
        this.supportedLanguages.forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = lang;

            if (lang === 'en') {
                link.href = `${baseUrl}/${fileName}`;
            } else {
                link.href = `${baseUrl}/${lang}/${fileName}`;
            }

            head.appendChild(link);
        });

        // Add x-default hreflang (pointing to English)
        const defaultLink = document.createElement('link');
        defaultLink.rel = 'alternate';
        defaultLink.hreflang = 'x-default';
        defaultLink.href = `${baseUrl}/${fileName}`;
        head.appendChild(defaultLink);

        // Update canonical tag to current language version
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            head.appendChild(canonicalLink);
        }

        if (this.currentLanguage === 'en') {
            canonicalLink.href = `${baseUrl}/${fileName}`;
        } else {
            canonicalLink.href = `${baseUrl}/${this.currentLanguage}/${fileName}`;
        }
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }
}

// Initialize i18n system
let i18n;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        i18n = new RosehillI18n();
        window.i18n = i18n;
        i18n.init();
    });
} else {
    i18n = new RosehillI18n();
    window.i18n = i18n;
    i18n.init();
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RosehillI18n;
}
