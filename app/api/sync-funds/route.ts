import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { amcs, funds } from '@/lib/db/schema';

const SEC_API_BASE = 'https://api.sec.or.th';

interface AmcResponse {
  last_upd_date: string;
  unique_id: string;
  name_th: string;
  name_en: string;
}

interface FundResponse {
  last_upd_date: string;
  proj_id: string;
  regis_id: string;
  regis_date: string;
  cancel_date: string;
  proj_name_th: string;
  proj_name_en: string;
  proj_abbr_name: string;
  fund_status: string;
  unique_id: string;
  permit_us_investment: string;
  invest_country_flage: string;
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

export async function POST() {
  try {
    // 1. Fetch all AMCs
    console.log('Fetching AMCs from SEC...');
    const amcResponse = await fetch(`${SEC_API_BASE}/FundFactsheet/fund/amc`, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.SEC_LIST_API_KEY || '',
      },
    });
    
    if (!amcResponse.ok) {
      throw new Error(`Failed to fetch AMCs: ${amcResponse.statusText}`);
    }

    const amcData: AmcResponse[] = await amcResponse.json();
    console.log(`Found ${amcData.length} AMCs`);

    let totalFunds = 0;
    let syncedAmcs = 0;

    // 2. Sync each AMC and their funds
    for (const amc of amcData) {
      try {
        // Save or update AMC
        await db.insert(amcs)
          .values({
            uniqueId: amc.unique_id,
            nameTh: amc.name_th,
            nameEn: amc.name_en,
            lastUpdDate: parseSecDate(amc.last_upd_date),
          })
          .onConflictDoUpdate({
            target: amcs.uniqueId,
            set: {
              nameTh: amc.name_th,
              nameEn: amc.name_en,
              lastUpdDate: parseSecDate(amc.last_upd_date),
            },
          });

        syncedAmcs++;

        // 3. Fetch funds for this AMC
        const fundsResponse = await fetch(
          `${SEC_API_BASE}/FundFactsheet/fund/amc/${amc.unique_id}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.SEC_LIST_API_KEY || '',
            },
          }
        );

        if (!fundsResponse.ok) {
          console.warn(`Failed to fetch funds for AMC ${amc.unique_id}`);
          continue;
        }

        const fundsData: FundResponse[] = await fundsResponse.json();
        console.log(`AMC ${amc.name_th}: ${fundsData.length} funds`);

        // 4. Save all funds for this AMC
        for (const fund of fundsData) {
          await db.insert(funds)
            .values({
              projId: fund.proj_id,
              regisId: fund.regis_id,
              regisDate: parseSecDate(fund.regis_date),
              cancelDate: parseSecDate(fund.cancel_date),
              projNameTh: fund.proj_name_th,
              projNameEn: fund.proj_name_en,
              projAbbrName: fund.proj_abbr_name,
              fundStatus: fund.fund_status,
              amcUniqueId: amc.unique_id,
              permitUsInvestment: fund.permit_us_investment,
              investCountryFlag: fund.invest_country_flage,
              lastUpdDate: parseSecDate(fund.last_upd_date),
              latestNavDate: null,
              latestNavValue: null,
              latestNetAsset: null,
            })
            .onConflictDoUpdate({
              target: funds.projId,
              set: {
                regisId: fund.regis_id,
                regisDate: parseSecDate(fund.regis_date),
                cancelDate: parseSecDate(fund.cancel_date),
                projNameTh: fund.proj_name_th,
                projNameEn: fund.proj_name_en,
                projAbbrName: fund.proj_abbr_name,
                fundStatus: fund.fund_status,
                amcUniqueId: amc.unique_id,
                permitUsInvestment: fund.permit_us_investment,
                investCountryFlag: fund.invest_country_flage,
                lastUpdDate: parseSecDate(fund.last_upd_date),
                updatedAt: new Date(),
              },
            });

          totalFunds++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error syncing AMC ${amc.unique_id}:`, error);
        // Continue with next AMC even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Funds synced successfully',
      stats: {
        amcs: syncedAmcs,
        funds: totalFunds,
      },
    });
  } catch (error) {
    console.error('Error syncing funds:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
