import { query } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const tokenId = params.tokenId;
    
    // Validate token ID
    if (!tokenId || isNaN(parseInt(tokenId))) {
      return new Response(JSON.stringify({ error: 'Invalid token ID' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Query the database for the token
    const result = await query(
      `SELECT * FROM onchain_analysis_nfts WHERE token_id = $1 LIMIT 1`,
      [parseInt(tokenId)]
    );
    
    // Check if token exists
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json'
        }
      });
    }
    
    const nft = result.rows[0];
    
    // Get category name without description
    const categoryName = nft.category.split(':')[0]?.trim() || 'Alignment NFT';
    
    // Construct the NFT metadata
    const metadata = {
      name: `Onchain Alignment #${nft.token_id}`,
      description: `${categoryName} - An onchain alignment NFT representing your position (${nft.x_position}, ${nft.y_position}) in the crypto ecosystem.`,
      image: nft.image_url,
      background_color: "FFFFFF",
      attributes: [
        {
          trait_type: "Category",
          value: categoryName
        },
        {
          trait_type: "X Position",
          value: parseFloat(nft.x_position),
          display_type: "number"
        },
        {
          trait_type: "Y Position",
          value: parseFloat(nft.y_position),
          display_type: "number"
        },
        {
          trait_type: "Username",
          value: nft.username || "Anonymous"
        }
      ]
    };
    
    // Return the metadata as JSON
    return new Response(JSON.stringify(metadata, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours (86400 seconds)
      }
    });
    
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch token metadata' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
  }
} 