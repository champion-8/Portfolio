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
    const { proj_id, nav_date } = body;

    if (!proj_id) {
      return NextResponse.json(
        { success: false, error: 'proj_id is required' },
        { status: 400 }
      );
    }

    // Use today's date if not provided (format: YYYY-MM-DD)
    const dateToFetch = nav_date || new Date().toISOString().split('T')[0];

    // Fetch NAV data from SEC API
    console.log(`Fetching NAV for ${proj_id} on ${dateToFetch}`);
    const navResponse = await fetch(
      `${SEC_API_BASE}/FundDailyInfo/${proj_id}/dailynav/${dateToFetch}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.SEC_NAV_API_KEY || '',
        },
      }
    );

    if (!navResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch NAV: ${navResponse.statusText}`,
        },
        { status: navResponse.status }
      );
    }

    const navData: NavResponse = await navResponse.json();

    // Validate nav_date
    const navDate = parseSecDate(navData.nav_date);
    if (!navDate) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid nav_date received from SEC API: ${navData.nav_date}`,
        },
        { status: 400 }
      );
    }

    // Save NAV history
    const navHistoryId = `${proj_id}_${dateToFetch}`;
    const firstAmcInfo = navData.amc_info?.[0];

    await db.insert(navHistory)
      .values({
        id: navHistoryId,
        projId: proj_id,
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
      .where(eq(funds.projId, proj_id));

    return NextResponse.json({
      success: true,
      message: 'NAV data saved successfully',
      data: {
        proj_id,
        nav_date: navData.nav_date,
        last_val: navData.last_val,
        net_asset: navData.net_asset,
      },
    });
  } catch (error) {
    console.error('Error fetching NAV:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve NAV history for a fund
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proj_id = searchParams.get('proj_id');

    if (!proj_id) {
      return NextResponse.json(
        { success: false, error: 'proj_id is required' },
        { status: 400 }
      );
    }

    const history = await db.query.navHistory.findMany({
      where: eq(navHistory.projId, proj_id),
      orderBy: (navHistory, { desc }) => [desc(navHistory.navDate)],
      limit: 30, // Last 30 days
    });

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching NAV history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
