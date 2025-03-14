import { query } from '@/lib/db';

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Extract data from the request
    const { 
      tokenId, 
      txHash, 
      walletAddress, 
      x, 
      y, 
      category, 
      fid, 
      username 
    } = body;
    
    // Validate required fields
    if (!tokenId || !txHash || !walletAddress || !x || !y || !category) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generate the NFT image using the existing endpoint
    const mintImageResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/generate-mint-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x,
        y,
        category,
        profilePicture: body.profilePicture, // Pass along if it exists
        username: username || 'Anonymous',
      }),
    });
    
    if (!mintImageResponse.ok) {
      const errorData = await mintImageResponse.json();
      throw new Error(`Failed to generate mint image: ${errorData.error || mintImageResponse.statusText}`);
    }
    
    const mintImageData = await mintImageResponse.json();
    const imageUrl = mintImageData.imageUrl;
    
    if (!imageUrl) {
      throw new Error('No image URL returned from generate-mint-image');
    }
    
    // Save to database
    const insertQuery = `
      INSERT INTO onchain_analysis_nfts (
        token_id, 
        tx_hash, 
        wallet_address, 
        fid, 
        username, 
        x_position, 
        y_position, 
        category, 
        image_url
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    
    const values = [
      tokenId,
      txHash,
      walletAddress,
      fid || null,
      username || null,
      parseFloat(x),
      parseFloat(y),
      category,
      imageUrl
    ];
    
    const result = await query(insertQuery, values);
    const insertedId = result.rows[0]?.id;
    
    return new Response(
      JSON.stringify({
        success: true,
        id: insertedId,
        tokenId,
        imageUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error saving mint data:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to save mint data',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 