import { analyzeCryptoAlignment } from '@/lib/gemini';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid') || '977233';
  const limit = searchParams.get('limit') || '150';
  const cursor = searchParams.get('cursor') || null;
  const includeReplies = searchParams.get('include_replies') === 'true';

  try {
    // First page of casts
    const firstPageResponse = await fetchCasts(fid, limit, cursor, includeReplies);
    const firstPageData = await firstPageResponse.json();
    
    let allCasts = [...firstPageData.casts];
    let nextCursor = firstPageData.next?.cursor;
    
    // If we have a cursor and we need to fetch more casts
    if (nextCursor) {
      const secondPageResponse = await fetchCasts(fid, limit, nextCursor, includeReplies);
      const secondPageData = await secondPageResponse.json();
      
      allCasts = [...allCasts, ...secondPageData.casts];
      nextCursor = secondPageData.next?.cursor;
    }
    
    // Get user bio and profile picture if available
    let bio = '';
    let profilePicture = '';
    let username = '';
    let displayName = '';
    
    if (allCasts.length > 0 && allCasts[0].author) {
      const author = allCasts[0].author;
      
      if (author.profile && author.profile.bio) {
        bio = author.profile.bio.text || '';
      }
      
      profilePicture = author.pfp_url || '';
      username = author.username || '';
      displayName = author.display_name || '';
    }
    
    // Extract just the text from casts
    const castTexts = allCasts.map(cast => cast.text || '').filter(text => text.trim() !== '');
    
    // Analyze the casts using Gemini
    const analysis = await analyzeCryptoAlignment(bio, castTexts);
    
    return Response.json({
      casts: allCasts,
      castCount: castTexts.length,
      userInfo: {
        profilePicture,
        username,
        displayName,
        bio
      },
      analysis,
      next: { cursor: nextCursor }
    });
  } catch (error) {
    console.error('Error analyzing profile:', error);
    return Response.json({ error: 'Failed to analyze profile', details: error.message }, { status: 500 });
  }
}

async function fetchCasts(fid, limit, cursor, includeReplies) {
  const apiKey = process.env.NEYNAR_API_KEY;
  
  let url = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=${limit}&include_replies=${includeReplies}`;
  
  if (cursor) {
    url += `&cursor=${cursor}`;
  }
  
  return fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-api-key': apiKey
    }
  });
} 