import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure the S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get parameters from the request
    const fid = searchParams.get('fid') || '977233'; // Default to 977233 if not provided
    const xPosition = searchParams.get('x');
    const yPosition = searchParams.get('y');
    const category = searchParams.get('category');
    const profilePicture = searchParams.get('profilePicture');
    const username = searchParams.get('username');
    
    if (!xPosition || !yPosition || !category) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generate timestamp for the filename
    const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp (seconds since epoch)
    const filename = `${fid}-${timestamp}.png`;
    const objectKey = `onchain-analysis/${filename}`;
    
    // Construct the OG image URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // For local development, use a direct URL without hostname
    const ogImageUrl = new URL('/api/og', process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : baseUrl);
    ogImageUrl.searchParams.set('x', xPosition);
    ogImageUrl.searchParams.set('y', yPosition);
    ogImageUrl.searchParams.set('category', category);
    if (profilePicture) ogImageUrl.searchParams.set('profilePicture', profilePicture);
    if (username) ogImageUrl.searchParams.set('username', username);
    
    console.log('Fetching OG image from:', ogImageUrl.toString());
    
    // Fetch the OG image
    const ogImageResponse = await fetch(ogImageUrl.toString(), {
      // Add a longer timeout for image generation
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    });
    
    if (!ogImageResponse.ok) {
      const errorText = await ogImageResponse.text();
      throw new Error(`Failed to generate OG image: ${ogImageResponse.status} ${ogImageResponse.statusText}. Details: ${errorText}`);
    }
    
    // Get the image data as a buffer
    const imageBuffer = await ogImageResponse.arrayBuffer();
    
    if (!imageBuffer || imageBuffer.byteLength === 0) {
      throw new Error('Generated image is empty');
    }
    
    console.log(`Successfully generated image: ${imageBuffer.byteLength} bytes`);
    
    // Upload to Cloudflare R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: objectKey,
        Body: Buffer.from(imageBuffer),
        ContentType: 'image/png',
        ACL: 'public-read',
      })
    );
    
    // Construct the public URL for the uploaded image
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${objectKey}`;
    
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        filename: filename,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating and uploading share image:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate and upload share image',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 