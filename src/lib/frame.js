import * as frame from '@farcaster/frame-sdk'

export async function initializeFrame() {
  let user = await frame.sdk.context.user;
  
  // Handle the known issue where user might be nested
  if (user?.user) {
    user = user.user;
  }

  if (!user || !user.fid) {
    // most likely not in a frame
    return;
  }

  window.userFid = user.fid;
  } 