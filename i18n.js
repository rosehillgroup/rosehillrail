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

        this.isLoaded = true;
        this.dispatchEvent('i18nLoaded');
    }

    detectLanguage() {
        // Check localStorage first
        const savedLang = localStorage.getItem('rosehill_rail_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
            return;
        }

        // Check browser language
        const browserLang = this.getBrowserLanguage();
        if (browserLang && this.supportedLanguages.includes(browserLang)) {
            this.currentLanguage = browserLang;
            return;
        }

        // Default to English
        this.currentLanguage = this.defaultLanguage;
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
                    element.textContent = translation;
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

        this.currentLanguage = newLanguage;
        localStorage.setItem('rosehill_rail_language', newLanguage);

        // Load new translations
        await this.loadTranslations();

        // Apply new language
        this.applyLanguage();

        // Dispatch event
        this.dispatchEvent('languageChanged', { language: newLanguage });
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

        // Update active states on all language options
        document.querySelectorAll('[data-language]').forEach(option => {
            const lang = option.getAttribute('data-language');
            if (lang === this.currentLanguage) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
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
