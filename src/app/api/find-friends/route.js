import { query } from '@/lib/db';

// Fetch following data from Neynar API
async function fetchFollowingFromNeynar(fid, limit = 100, cursor = null) {
  const apiKey = process.env.NEYNAR_API_KEY;
  
  let url = `https://api.neynar.com/v2/farcaster/following?fid=${fid}&limit=${limit}&sort_type=desc_chron`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Neynar API returned ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Neynar:', error);
    throw error;
  }
}

// Fetch user profile pictures in bulk from Neynar API (up to 100 at a time)
async function fetchUserProfilePictures(fids) {
  if (!fids || fids.length === 0) return [];
  
  const apiKey = process.env.NEYNAR_API_KEY;
  
  try {
    // Only process up to 100 FIDs per request as per API limits
    const fidsToProcess = fids.slice(0, 100);
    const fidsParam = fidsToProcess.join(',');
    
    const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsParam}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Neynar Bulk API returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    if (!data.users) {
      return [];
    }
    
    // Map the response to a simple object with fid -> pfp_url mapping
    return data.users.map(user => ({
      fid: user.fid,
      username: user.username,
      display_name: user.display_name,
      pfp_url: user.pfp_url
    }));
  } catch (error) {
    console.error('Error fetching user profile pictures:', error);
    return [];
  }
}

// Process FIDs in batches of 100 for profile picture retrieval
async function fetchAllProfilePictures(fids) {
  const results = [];
  const batchSize = 100;
  
  for (let i = 0; i < fids.length; i += batchSize) {
    const batch = fids.slice(i, i + batchSize);
    console.log(`Fetching profile pictures for batch ${i/batchSize + 1}, size: ${batch.length}`);
    
    const batchResults = await fetchUserProfilePictures(batch);
    results.push(...batchResults);
    
    // Rate limit ourselves to avoid hitting Neynar's limits
    if (i + batchSize < fids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Get all following for a user from Neynar (up to maxFollowing)
async function getAllFollowing(fid, maxFollowing = 500) {
  console.log(`Fetching up to ${maxFollowing} following for FID ${fid} from Neynar`);
  
  let allFollowing = [];
  let cursor = null;
  const limit = 100; // Max limit per request
  
  try {
    while (allFollowing.length < maxFollowing) {
      const data = await fetchFollowingFromNeynar(fid, limit, cursor);
      
      if (!data.users || data.users.length === 0) {
        break;
      }
      
      // Extract user data from the following response
      const followingDetails = data.users.map(follow => {
        const user = follow.user;
        if (!user) return null;
        
        return {
          fid: user.fid,
          username: user.username
        };
      }).filter(Boolean); // Remove any null values
      
      allFollowing = [...allFollowing, ...followingDetails];
      
      // Check if there's more data
      if (!data.next || !data.next.cursor) {
        break;
      }
      
      cursor = data.next.cursor;
      
      // Rate limit ourselves to avoid hitting Neynar's limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Retrieved ${allFollowing.length} following for FID ${fid}`);
    return allFollowing;
  } catch (error) {
    console.error('Error getting all following:', error);
    throw error;
  }
}

// Store following data in our database
async function saveFollowingToDatabase(fid, username, followingDetails) {
  console.log(`Saving following data for FID ${fid} to database`);
  
  // Extract just the FIDs for the following array
  const followingFids = followingDetails.map(user => user.fid);
  
  try {
    // First check if the record exists
    const existingRecord = await query(
      'SELECT fid FROM farcaster_following WHERE fid = $1',
      [fid]
    );
    
    if (existingRecord.rows.length > 0) {
      // Update existing record
      await query(
        `UPDATE farcaster_following 
         SET username = $2, 
             following = $3, 
             following_details = $4, 
             following_count = $5,
             created_at = NOW()
         WHERE fid = $1`,
        [
          fid, 
          username || `fid:${fid}`, 
          JSON.stringify(followingFids), 
          JSON.stringify(followingDetails),
          followingDetails.length
        ]
      );
      console.log(`Updated following data for FID ${fid}`);
    } else {
      // Insert new record
      await query(
        `INSERT INTO farcaster_following 
         (fid, username, following, following_details, following_count) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          fid, 
          username || `fid:${fid}`, 
          JSON.stringify(followingFids), 
          JSON.stringify(followingDetails),
          followingDetails.length
        ]
      );
      console.log(`Inserted new following data for FID ${fid}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving following to database:', error);
    throw error;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');
  
  if (!fid) {
    return Response.json({ error: 'FID parameter is required' }, { status: 400 });
  }

  try {
    // First, check if we already have following data for this user
    const followingQuery = await query(
      'SELECT username, following_details FROM farcaster_following WHERE fid = $1',
      [fid]
    );

    let followingDetails = [];
    let username = null;
    
    // If user not found in our database, fetch from Neynar API
    if (!followingQuery.rows.length || !followingQuery.rows[0].following_details) {
      console.log(`FID ${fid} not found in database, fetching from Neynar API`);
      
      try {
        // First, get the username by calling the user endpoint
        const userResponse = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-key': process.env.NEYNAR_API_KEY
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.user) {
            username = userData.user.username;
          }
        }
        
        // Then get following data
        followingDetails = await getAllFollowing(fid);
        
        // Save to database for future use
        if (followingDetails.length > 0) {
          await saveFollowingToDatabase(fid, username, followingDetails);
        }
      } catch (neynarError) {
        console.error('Error fetching from Neynar:', neynarError);
        return Response.json({ 
          error: 'Could not fetch following data from Neynar API', 
          details: neynarError.message,
          friends: [] 
        }, { status: 500 });
      }
    } else {
      // Use existing data from database
      followingDetails = followingQuery.rows[0].following_details;
      username = followingQuery.rows[0].username;
    }

    // Extract usernames from following details
    const friendUsernames = followingDetails.map(friend => friend.username);
    
    // Debug information about what usernames we found
    console.log(`Found ${friendUsernames.length} friends for FID ${fid}`);
    
    // If no friends found, return empty array
    if (friendUsernames.length === 0) {
      return Response.json({ 
        message: 'No friends found for this user',
        friends: [] 
      });
    }

    // Get NFT data for friends from onchain_analysis_nfts table
    // Using ANY with parameterized query for PostgreSQL array
    const nftDataQuery = await query(
      `SELECT DISTINCT ON (username)
        id, token_id, tx_hash, wallet_address, username, 
        x_position, y_position, category, image_url, created_at
      FROM onchain_analysis_nfts
      WHERE username = ANY($1)
      ORDER BY username, created_at DESC`,
      [friendUsernames]
    );

    // Format the friend NFT data
    const friendNFTs = nftDataQuery.rows.map(nft => ({
      id: nft.id,
      token_id: nft.token_id,
      tx_hash: nft.tx_hash,
      wallet_address: nft.wallet_address,
      username: nft.username,
      fid: null, // We'll try to find this later
      position: {
        x: parseFloat(nft.x_position),
        y: parseFloat(nft.y_position)
      },
      category: nft.category,
      image_url: nft.image_url,
      created_at: nft.created_at
    }));
    
    // Get FIDs for all friends with NFTs by finding matching usernames
    for (let i = 0; i < friendNFTs.length; i++) {
      const match = followingDetails.find(f => f.username === friendNFTs[i].username);
      if (match) {
        friendNFTs[i].fid = match.fid;
      }
    }
    
    // Get profile pictures for friends with FIDs
    const friendsWithFids = friendNFTs.filter(friend => friend.fid);
    const fidsToLookup = friendsWithFids.map(friend => friend.fid);
    
    if (fidsToLookup.length > 0) {
      console.log(`Fetching profile pictures for ${fidsToLookup.length} friends`);
      const profilePicData = await fetchAllProfilePictures(fidsToLookup);
      
      // Map profile pictures to friends
      for (let i = 0; i < friendNFTs.length; i++) {
        if (friendNFTs[i].fid) {
          const picData = profilePicData.find(p => p.fid === friendNFTs[i].fid);
          if (picData && picData.pfp_url) {
            friendNFTs[i].profile_picture = picData.pfp_url;
            friendNFTs[i].display_name = picData.display_name;
          }
        }
      }
    }

    // Debug information about results
    console.log(`Found ${friendNFTs.length} friend NFTs in the database`);
    console.log(`Added profile pictures for ${friendNFTs.filter(f => f.profile_picture).length} friends`);

    return Response.json({
      fid,
      username,
      friends_count: friendNFTs.length,
      friends: friendNFTs
    });
    
  } catch (error) {
    console.error('Error finding friends:', error);
    return Response.json(
      { error: 'Failed to find friends', details: error.message }, 
      { status: 500 }
    );
  }
} 