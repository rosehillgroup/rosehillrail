export default async (request, context) => {
  // Handle language-prefixed URLs (e.g., /fr/products.html → /products.html?lang=fr)
  const url = new URL(request.url);
  const languageMatch = url.pathname.match(/^\/(fr|it|de)\/(.*)/);

  if (languageMatch) {
    const [, lang, path] = languageMatch;

    // Rewrite URL to root file with language query param
    const newUrl = new URL(`/${path}`, url.origin);
    newUrl.searchParams.set('lang', lang);

    // Rewrite the request to the root file (keeps /fr/ URL in browser)
    return context.rewrite(newUrl);
  }

  // Original geo-cookie functionality for non-language paths
  // Netlify adds IP-derived geo on the request at the edge
  // @ts-ignore
  const g = context.geo || {};
  const geo = {
    country: g.country?.code || '',
    region: g.subdivision?.code || '',
    city: g.city || '',
    latitude: g.latitude || '',
    longitude: g.longitude || '',
    timezone: g.timezone || ''
  };

  // Continue to the origin
  const response = await context.next();

  const value = encodeURIComponent(JSON.stringify(geo));
  // Share across subdomains (adjust if you only want per-site)
  const domain = '.rosehill.group'; // or omit to keep per-subdomain
  response.headers.append(
    'Set-Cookie',
    `nl_geo=${value}; Path=/; Max-Age=900; SameSite=Lax; Domain=${domain}`
  );

  return response;
};