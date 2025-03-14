import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Query the database for the highest token ID
    const result = await query(
      'SELECT MAX(token_id) as max_token_id FROM onchain_analysis_nfts'
    );
    
    // Get the max token ID or default to 0 if no mints exist
    const latestTokenId = result.rows[0]?.max_token_id || 0;
    
    // Return the latest token ID
    return NextResponse.json({ 
      latestTokenId,
      nextTokenId: latestTokenId + 1 // Also provide the next token ID for convenience
    });
  } catch (error) {
    console.error('Error fetching latest token ID:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch latest token ID',
        details: error.message
      },
      { status: 500 }
    );
  }
} 