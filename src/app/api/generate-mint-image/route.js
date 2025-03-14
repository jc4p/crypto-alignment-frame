import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request) {
  try {
    const { x, y, category, profilePicture, username } = await request.json();

    // Create S3 client for Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    // Get the base URL from the current request
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    
    console.log('Base URL for NFT image:', baseUrl);
    
    // Construct the OG image URL using the same host as the current request
    const ogNftUrl = new URL('/api/og-nft', baseUrl);
    ogNftUrl.searchParams.set('x', x);
    ogNftUrl.searchParams.set('y', y);
    ogNftUrl.searchParams.set('category', category);
    ogNftUrl.searchParams.set('username', username);
    if (profilePicture) ogNftUrl.searchParams.set('profilePicture', profilePicture);
    
    console.log('Fetching OG NFT image from:', ogNftUrl.toString());

    // Fetch the generated image
    const imageResponse = await fetch(ogNftUrl.toString(), {
      // Add a longer timeout for image generation
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    });
    
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      throw new Error(`Failed to generate NFT image: ${imageResponse.status} ${imageResponse.statusText}. Details: ${errorText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    if (!imageBuffer || imageBuffer.byteLength === 0) {
      throw new Error('Generated image is empty');
    }
    
    console.log(`Successfully generated NFT image: ${imageBuffer.byteLength} bytes`);

    // Generate a unique filename using timestamp and username
    const timestamp = Date.now();
    const filename = `${username.replace('@', '')}-${timestamp}.png`;

    // Upload to R2
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `onchain-alignment-nfts/${filename}`,
      Body: Buffer.from(imageBuffer),
      ContentType: 'image/png',
    }));

    // Return the R2 URL
    const r2Url = `${process.env.R2_PUBLIC_URL}/onchain-alignment-nfts/${filename}`;

    return Response.json({ 
      success: true, 
      imageUrl: r2Url 
    });

  } catch (error) {
    console.error('Error in generate-mint-image:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 