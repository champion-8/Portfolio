import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stocks } from '@/lib/db/schema';
import * as XLSX from 'xlsx';

interface ExcelRow {
  symbol?: unknown;
  nameTh?: unknown;
  market?: unknown;
  sector?: unknown;
  industry?: unknown;
  address?: unknown;
  postalCode?: unknown;
  phone?: unknown;
  fax?: unknown;
  website?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload .xls or .xlsx file' },
        { status: 400 }
      );
    }

    console.log('Reading Excel file...');
    
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Read workbook from buffer
    const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 874 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON, skip first 2 rows (headers)
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      range: 2,
      header: [
        'symbol',
        'nameTh',
        'market',
        'sector',
        'industry',
        'address',
        'postalCode',
        'phone',
        'fax',
        'website'
      ],
      defval: null
    });

    console.log(`Found ${data.length} companies`);

    let insertedCount = 0;
    let errorCount = 0;
    const errors: Array<{ symbol: string; error: string }> = [];

    // Import each company
    for (const row of data as ExcelRow[]) {
      try {
        // Skip if no symbol or convert to string
        const symbolValue = row.symbol ? String(row.symbol).trim() : '';
        if (!symbolValue) {
          continue;
        }

        await db.insert(stocks)
          .values({
            symbol: symbolValue,
            nameTh: row.nameTh ? String(row.nameTh) : '',
            market: row.market ? String(row.market) : null,
            sector: row.sector ? String(row.sector) : null,
            industry: row.industry ? String(row.industry) : null,
            address: row.address ? String(row.address) : null,
            postalCode: row.postalCode ? String(row.postalCode) : null,
            phone: row.phone ? String(row.phone) : null,
            fax: row.fax ? String(row.fax) : null,
            website: row.website ? String(row.website) : null,
            latestPrice: null,
            latestPriceDate: null,
          })
          .onConflictDoUpdate({
            target: stocks.symbol,
            set: {
              nameTh: row.nameTh ? String(row.nameTh) : '',
              market: row.market ? String(row.market) : null,
              sector: row.sector ? String(row.sector) : null,
              industry: row.industry ? String(row.industry) : null,
              address: row.address ? String(row.address) : null,
              postalCode: row.postalCode ? String(row.postalCode) : null,
              phone: row.phone ? String(row.phone) : null,
              fax: row.fax ? String(row.fax) : null,
              website: row.website ? String(row.website) : null,
              updatedAt: new Date(),
            },
          });

        insertedCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const symbolForError = row.symbol ? String(row.symbol) : 'unknown';
        console.error(`Error importing ${symbolForError}:`, errorMessage);
        errors.push({
          symbol: symbolForError,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stock data imported successfully',
      stats: {
        total: data.length,
        inserted: insertedCount,
        errors: errorCount,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error('Error importing stocks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
