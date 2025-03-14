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
    
    // Validate required fields (tokenId is now optional)
    if (!txHash || !walletAddress || !x || !y || !category) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // If tokenId is not provided, get the next available token ID
    let finalTokenId = tokenId;
    if (!finalTokenId) {
      try {
        const tokenIdResult = await query(
          'SELECT MAX(token_id) as max_token_id FROM onchain_analysis_nfts'
        );
        const latestTokenId = tokenIdResult.rows[0]?.max_token_id || 0;
        finalTokenId = latestTokenId + 1;
        console.log('Generated next token ID:', finalTokenId);
      } catch (tokenIdError) {
        console.error('Error getting next token ID:', tokenIdError);
        return new Response(JSON.stringify({ 
          error: 'Failed to generate token ID',
          details: tokenIdError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
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
      finalTokenId,
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
        tokenId: finalTokenId,
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