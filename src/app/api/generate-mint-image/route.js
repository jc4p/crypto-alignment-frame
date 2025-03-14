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

    // Generate the NFT image URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    const imageUrl = `${baseUrl}/api/og-nft?x=${x}&y=${y}&category=${encodeURIComponent(category)}&username=${encodeURIComponent(username)}${profilePicture ? `&profilePicture=${encodeURIComponent(profilePicture)}` : ''}`;

    // Fetch the generated image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to generate NFT image');
    }
    const imageBuffer = await imageResponse.arrayBuffer();

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