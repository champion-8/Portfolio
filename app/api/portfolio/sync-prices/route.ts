import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPortfolio, funds, stocks, cryptos, navHistory } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const BITKUB_TICKER_URL = 'https://api.bitkub.com/api/market/ticker';
const SEC_API_BASE = 'https://api.sec.or.th';

interface SyncResult {
  assetType: string;
  assetId: string;
  assetName: string;
  status: 'cached' | 'updated' | 'failed';
  oldPrice?: number;
  newPrice?: number;
  message?: string;
  lastUpdate?: Date | null;
}

interface NavResponse {
  nav_date: string;
  unique_id: string;
  class_abbr_name: string;
  net_asset: number;
  last_val: number;
  previous_val: number;
  sell_price: number;
  buy_price: number;
  sell_swap_price: number;
  buy_swap_price: number;
  remark_th: string;
  remark_en: string;
  last_upd_date: string;
}

// Helper function to safely parse dates from SEC API
function parseSecDate(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null;
  
  // Check for invalid date formats like "0000-00-00"
  if (dateString.startsWith('0000-00-00')) return null;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

// Helper function to check if data is stale
function isStale(lastUpdate: Date | null, thresholdMs: number): boolean {
  if (!lastUpdate) return true;
  const now = new Date();
  const diff = now.getTime() - lastUpdate.getTime();
  return diff > thresholdMs;
}

// Function to fetch and update NAV from SEC API
// Try fetching from today back to 10 days ago (for weekends/holidays)
async function fetchAndUpdateNav(projId: string): Promise<{ success: boolean; newPrice?: number; error?: string }> {
  const errors: string[] = [];
  // Try from today back to 10 days
  for (let daysAgo = 0; daysAgo <= 10; daysAgo++) {
    try {
      // Get date in Thailand timezone (UTC+7) in YYYY-MM-DD format
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);
      const dateToFetch = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      
      const navResponse = await fetch(
        `${SEC_API_BASE}/FundDailyInfo/${projId}/dailynav/${dateToFetch}`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.SEC_NAV_API_KEY || '',
          },
        }
      );

      if (!navResponse.ok) {
        errors.push(`${dateToFetch}: ${navResponse.statusText}`);
        continue; // Try previous day
      }

      // Parse JSON response (SEC API returns array)
      let navDataArray: NavResponse[];
      try {
        navDataArray = await navResponse.json();
      } catch {
        errors.push(`${dateToFetch}: Invalid JSON`);
        continue; // Try previous day
      }

      // Check if array is empty
      if (!Array.isArray(navDataArray) || navDataArray.length === 0) {
        errors.push(`${dateToFetch}: Empty response array`);
        continue; // Try previous day
      }

      // Use first class data
      const navData = navDataArray[0];

      // Validate nav_date
      const navDate = parseSecDate(navData.nav_date);
      if (!navDate) {
        errors.push(`${dateToFetch}: Invalid nav_date`);
        continue; // Try previous day
      }

      // Success! Save NAV history
      const navHistoryId = `${projId}_${dateToFetch}`;

      await db.insert(navHistory)
        .values({
          id: navHistoryId,
          projId: projId,
          navDate: navDate,
          classAbbrName: navData.class_abbr_name,
          netAsset: navData.net_asset,
          lastVal: navData.last_val,
          previousVal: navData.previous_val,
          sellPrice: navData.sell_price,
          buyPrice: navData.buy_price,
          sellSwapPrice: navData.sell_swap_price,
          buySwapPrice: navData.buy_swap_price,
          remarkTh: navData.remark_th,
          remarkEn: navData.remark_en,
          lastUpdDate: parseSecDate(navData.last_upd_date),
        })
        .onConflictDoUpdate({
          target: navHistory.id,
          set: {
            classAbbrName: navData.class_abbr_name,
            netAsset: navData.net_asset,
            lastVal: navData.last_val,
            previousVal: navData.previous_val,
            sellPrice: navData.sell_price,
            buyPrice: navData.buy_price,
            sellSwapPrice: navData.sell_swap_price,
            buySwapPrice: navData.buy_swap_price,
            remarkTh: navData.remark_th,
            remarkEn: navData.remark_en,
            lastUpdDate: parseSecDate(navData.last_upd_date),
          },
        });

      // Update fund with latest NAV data
      await db.update(funds)
        .set({
          latestNavDate: navDate,
          latestNavValue: navData.last_val,
          latestNetAsset: navData.net_asset,
          updatedAt: new Date(),
        })
        .where(eq(funds.projId, projId));

      console.log(`✓ Successfully fetched NAV for ${projId} on ${dateToFetch}`);
      return { success: true, newPrice: navData.last_val };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${daysAgo} days ago: ${errorMessage}`);
      continue; // Try previous day
    }
  }

  // If we get here, all attempts failed
  return { 
    success: false, 
    error: `No NAV data found in last 10 days. Errors: ${errors.join('; ')}` 
  };
}

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's portfolio
    const portfolio = await db
      .select()
      .from(userPortfolio)
      .where(eq(userPortfolio.userId, session.userId));

    if (portfolio.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No assets in portfolio',
        results: [],
      });
    }

    const results: SyncResult[] = [];
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Group assets by type
    const fundIds = portfolio.filter(p => p.assetType === 'fund').map(p => p.assetId);
    const stockSymbols = portfolio.filter(p => p.assetType === 'stock').map(p => p.assetId);
    const cryptoSymbols = portfolio.filter(p => p.assetType === 'crypto').map(p => p.assetId);

    // Process Funds (threshold: 1 day)
    if (fundIds.length > 0) {
      const fundRecords = await db
        .select()
        .from(funds)
        .where(inArray(funds.projId, fundIds));

      for (const fund of fundRecords) {
        const portfolioItem = portfolio.find(p => p.assetId === fund.projId);
        if (!portfolioItem) continue;

        const oldPrice = fund.latestNavValue || 0;
        
        // Check if update is needed (data older than 1 day or no data)
        if (isStale(fund.latestNavDate, ONE_DAY_MS) || !fund.latestNavValue) {
          // Fetch fresh NAV from SEC API
          console.log(`Fetching fresh NAV for fund ${fund.projId}...`);
          const navResult = await fetchAndUpdateNav(fund.projId);
          console.log(`Result ${fund.projId} : ${JSON.stringify(navResult)}`);
          if (navResult.success && navResult.newPrice) {
            results.push({
              assetType: 'fund',
              assetId: fund.projId,
              assetName: portfolioItem.assetName,
              status: 'updated',
              oldPrice: oldPrice,
              newPrice: navResult.newPrice,
              message: 'NAV updated from SEC API',
              lastUpdate: new Date(),
            });
          } else {
            results.push({
              assetType: 'fund',
              assetId: fund.projId,
              assetName: portfolioItem.assetName,
              status: 'failed',
              oldPrice: oldPrice,
              message: `Failed to fetch NAV: ${navResult.error || 'Unknown error'}`,
              lastUpdate: fund.latestNavDate,
            });
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          results.push({
            assetType: 'fund',
            assetId: fund.projId,
            assetName: portfolioItem.assetName,
            status: 'cached',
            oldPrice: oldPrice,
            newPrice: oldPrice,
            message: 'Using cached data (less than 1 day old)',
            lastUpdate: fund.latestNavDate,
          });
        }
      }
    }

    // Process Stocks (threshold: 1 hour)
    if (stockSymbols.length > 0) {
      const stockRecords = await db
        .select()
        .from(stocks)
        .where(inArray(stocks.symbol, stockSymbols));

      for (const stock of stockRecords) {
        const portfolioItem = portfolio.find(p => p.assetId === stock.symbol);
        if (!portfolioItem) continue;

        const oldPrice = stock.latestPrice || 0;
        
        // Check if update is needed (data older than 1 hour)
        if (isStale(stock.latestPriceDate, ONE_HOUR_MS) || !stock.latestPrice) {
          try {
            // Fetch fresh price from Yahoo Finance
            const yahooSymbol = `${stock.symbol}.BK`;
            console.log(`Fetching fresh price for ${yahooSymbol}...`);
            
            const quote = await yahooFinance.quote(yahooSymbol) as {
              regularMarketPrice?: number;
              regularMarketTime?: Date;
            };

            if (quote && quote.regularMarketPrice) {
              const newPrice = quote.regularMarketPrice;
              const priceDate = quote.regularMarketTime || new Date();

              // Update database
              await db.update(stocks)
                .set({
                  latestPrice: newPrice,
                  latestPriceDate: priceDate,
                  updatedAt: new Date(),
                })
                .where(eq(stocks.symbol, stock.symbol));

              results.push({
                assetType: 'stock',
                assetId: stock.symbol,
                assetName: portfolioItem.assetName,
                status: 'updated',
                oldPrice: oldPrice,
                newPrice: newPrice,
                message: 'Price updated from Yahoo Finance',
                lastUpdate: priceDate,
              });

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              results.push({
                assetType: 'stock',
                assetId: stock.symbol,
                assetName: portfolioItem.assetName,
                status: 'failed',
                oldPrice: oldPrice,
                message: 'No price data available from Yahoo Finance',
                lastUpdate: stock.latestPriceDate,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.push({
              assetType: 'stock',
              assetId: stock.symbol,
              assetName: portfolioItem.assetName,
              status: 'failed',
              oldPrice: oldPrice,
              message: `Failed to fetch price: ${errorMessage}`,
              lastUpdate: stock.latestPriceDate,
            });
          }
        } else {
          results.push({
            assetType: 'stock',
            assetId: stock.symbol,
            assetName: portfolioItem.assetName,
            status: 'cached',
            oldPrice: oldPrice,
            newPrice: oldPrice,
            message: 'Using cached data (less than 1 hour old)',
            lastUpdate: stock.latestPriceDate,
          });
        }
      }
    }

    // Process Cryptos (threshold: 1 hour)
    if (cryptoSymbols.length > 0) {
      const cryptoRecords = await db
        .select()
        .from(cryptos)
        .where(inArray(cryptos.symbol, cryptoSymbols));

      // Check if any crypto needs update
      const needsUpdate = cryptoRecords.some(crypto => 
        isStale(crypto.lastUpdated, ONE_HOUR_MS) || !crypto.last
      );

      if (needsUpdate) {
        try {
          // Fetch all prices from Bitkub at once
          console.log('Fetching fresh crypto prices from Bitkub...');
          const response = await fetch(BITKUB_TICKER_URL);
          
          if (!response.ok) {
            throw new Error('Failed to fetch crypto prices from Bitkub');
          }

          const pricesData: Record<string, {
            last: number;
            lowestAsk: number;
            highestBid: number;
            percentChange: number;
            high24hr: number;
            low24hr: number;
            change: number;
          }> = await response.json();

          // Update each crypto
          for (const crypto of cryptoRecords) {
            const portfolioItem = portfolio.find(p => p.assetId === crypto.symbol);
            if (!portfolioItem) continue;

            const oldPrice = crypto.last || 0;
            const ticker = pricesData[crypto.symbol];

            if (ticker) {
              const newPrice = ticker.last;

              // Update database
              await db.update(cryptos)
                .set({
                  last: ticker.last,
                  lowestAsk: ticker.lowestAsk,
                  highestBid: ticker.highestBid,
                  percentChange: ticker.percentChange,
                  high24hr: ticker.high24hr,
                  low24hr: ticker.low24hr,
                  change: ticker.change,
                  lastUpdated: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(cryptos.symbol, crypto.symbol));

              results.push({
                assetType: 'crypto',
                assetId: crypto.symbol,
                assetName: portfolioItem.assetName,
                status: 'updated',
                oldPrice: oldPrice,
                newPrice: newPrice,
                message: 'Price updated from Bitkub',
                lastUpdate: new Date(),
              });
            } else {
              results.push({
                assetType: 'crypto',
                assetId: crypto.symbol,
                assetName: portfolioItem.assetName,
                status: 'failed',
                oldPrice: oldPrice,
                message: 'Symbol not found in Bitkub response',
                lastUpdate: crypto.lastUpdated,
              });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Mark all cryptos as failed
          for (const crypto of cryptoRecords) {
            const portfolioItem = portfolio.find(p => p.assetId === crypto.symbol);
            if (!portfolioItem) continue;

            results.push({
              assetType: 'crypto',
              assetId: crypto.symbol,
              assetName: portfolioItem.assetName,
              status: 'failed',
              oldPrice: crypto.last || 0,
              message: `Failed to fetch prices: ${errorMessage}`,
              lastUpdate: crypto.lastUpdated,
            });
          }
        }
      } else {
        // All cryptos are fresh, use cached data
        for (const crypto of cryptoRecords) {
          const portfolioItem = portfolio.find(p => p.assetId === crypto.symbol);
          if (!portfolioItem) continue;

          const price = crypto.last || 0;
          results.push({
            assetType: 'crypto',
            assetId: crypto.symbol,
            assetName: portfolioItem.assetName,
            status: 'cached',
            oldPrice: price,
            newPrice: price,
            message: 'Using cached data (less than 1 hour old)',
            lastUpdate: crypto.lastUpdated,
          });
        }
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      cached: results.filter(r => r.status === 'cached').length,
      updated: results.filter(r => r.status === 'updated').length,
      failed: results.filter(r => r.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error('Sync portfolio prices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync portfolio prices' },
      { status: 500 }
    );
  }
}
