/**
 * Deep links to grocery/delivery sites' own search pages for a given item name.
 * These are search-page convenience links only, not a real ordering/cart integration -
 * true delivery integration would require official retailer partner APIs.
 */
export function buildShoppingLinks(itemName: string) {
  const q = encodeURIComponent(itemName)
  return [
    { label: 'Instacart', url: `https://www.instacart.com/store/search/${q}` },
    { label: 'Walmart', url: `https://www.walmart.com/search?q=${q}` },
    { label: 'Amazon Fresh', url: `https://www.amazon.com/s?k=${q}` },
  ]
}
