import { NextResponse } from 'next/server';

const BITKUB_SYMBOLS_URL = 'https://api.bitkub.com/api/market/symbols';

interface BitkubSymbol {
  id: number;
  symbol: string;
  info: string;
}

interface BitkubSymbolsResponse {
  error: number;
  result: BitkubSymbol[];
}

export async function GET() {
  try {
    console.log('Fetching crypto symbols from Bitkub...');
    
    const response = await fetch(BITKUB_SYMBOLS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bitkub: ${response.statusText}`);
    }

    const data: BitkubSymbolsResponse = await response.json();
    
    if (data.error !== 0) {
      throw new Error(`Bitkub API error: ${data.error}`);
    }

    // Transform the data to a more usable format
    const symbols = data.result.map(item => ({
      id: item.id,
      symbol: item.symbol,
      baseSymbol: item.symbol.replace('THB_', ''),
      name: item.info,
    }));

    return NextResponse.json({
      success: true,
      count: symbols.length,
      data: symbols,
    });
  } catch (error) {
    console.error('Error fetching crypto symbols:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
