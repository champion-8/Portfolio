import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { funds, navHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const SEC_API_BASE = 'https://api.sec.or.th';

interface NavResponse {
  last_upd_date: string;
  nav_date: string;
  class_abbr_name: string;
  net_asset: number;
  last_val: number;
  previous_val: number;
  amc_info: Array<{
    unique_id: string;
    sell_price: number;
    buy_price: number;
    sell_swap_price: number;
    buy_swap_price: number;
    remark_th: string;
    remark_en: string;
  }>;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nav_date, limit } = body;

    // Use today's date if not provided (format: YYYY-MM-DD)
    const dateToFetch = nav_date || new Date().toISOString().split('T')[0];

    // Get all active funds from database
    console.log('Fetching all funds from database...');
    const allFunds = await db.query.funds.findMany({
      where: eq(funds.fundStatus, 'RG'),
      limit: limit || undefined, // Optional limit for testing
    });

    console.log(`Found ${allFunds.length} active funds`);

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ proj_id: string; error: string }> = [];

    // Fetch NAV for each fund
    for (const fund of allFunds) {
      try {
        console.log(`Fetching NAV for ${fund.projId} (${fund.projNameTh})`);
        
        const navResponse = await fetch(
          `${SEC_API_BASE}/FundDailyInfo/${fund.projId}/dailynav/${dateToFetch}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.SEC_NAV_API_KEY || '',
            },
          }
        );

        if (!navResponse.ok) {
          failCount++;
          errors.push({
            proj_id: fund.projId,
            error: `HTTP ${navResponse.status}: ${navResponse.statusText}`,
          });
          continue;
        }

        const navData: NavResponse = await navResponse.json();

        // Validate nav_date
        const navDate = parseSecDate(navData.nav_date);
        if (!navDate) {
          failCount++;
          errors.push({
            proj_id: fund.projId,
            error: `Invalid nav_date: ${navData.nav_date}`,
          });
          continue;
        }

        // Save NAV history
        const navHistoryId = `${fund.projId}_${dateToFetch}`;
        const firstAmcInfo = navData.amc_info?.[0];

        await db.insert(navHistory)
          .values({
            id: navHistoryId,
            projId: fund.projId,
            navDate: navDate,
            classAbbrName: navData.class_abbr_name,
            netAsset: navData.net_asset,
            lastVal: navData.last_val,
            previousVal: navData.previous_val,
            sellPrice: firstAmcInfo?.sell_price || null,
            buyPrice: firstAmcInfo?.buy_price || null,
            sellSwapPrice: firstAmcInfo?.sell_swap_price || null,
            buySwapPrice: firstAmcInfo?.buy_swap_price || null,
            remarkTh: firstAmcInfo?.remark_th || null,
            remarkEn: firstAmcInfo?.remark_en || null,
            lastUpdDate: parseSecDate(navData.last_upd_date),
          })
          .onConflictDoUpdate({
            target: navHistory.id,
            set: {
              classAbbrName: navData.class_abbr_name,
              netAsset: navData.net_asset,
              lastVal: navData.last_val,
              previousVal: navData.previous_val,
              sellPrice: firstAmcInfo?.sell_price || null,
              buyPrice: firstAmcInfo?.buy_price || null,
              sellSwapPrice: firstAmcInfo?.sell_swap_price || null,
              buySwapPrice: firstAmcInfo?.buy_swap_price || null,
              remarkTh: firstAmcInfo?.remark_th || null,
              remarkEn: firstAmcInfo?.remark_en || null,
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
          .where(eq(funds.projId, fund.projId));

        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching NAV for ${fund.projId}:`, errorMessage);
        errors.push({
          proj_id: fund.projId,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'NAV sync completed',
      stats: {
        total: allFunds.length,
        success: successCount,
        failed: failCount,
      },
      nav_date: dateToFetch,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Only return first 10 errors
    });
  } catch (error) {
    console.error('Error syncing all NAV:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
