'use client';

import { useEffect, useState } from 'react';
import HomeComponent from "./HomeComponent";
import * as frame from '@farcaster/frame-sdk';

export default function AlignmentChart() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const [shareResult, setShareResult] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [mintStatus, setMintStatus] = useState(null);
  const [mintTxHash, setMintTxHash] = useState(null);
  const [mintTokenId, setMintTokenId] = useState(null);

  useEffect(() => {
    const fetchCasts = async () => {
      // Skip if we've already analyzed
      if (hasAnalyzed) return;
      
      try {
        setLoading(true);
        setError(null);

        // Wait for window.userFid to be set by the frame initialization
        if (!window.userFid) {
          console.log('No FID found, waiting for frame context...');
          return;
        }

        // Call ready() here after we've started loading but before the API call
        try {
          await frame.sdk.actions.ready();
          console.log('Frame ready called');
        } catch (e) {
          console.log('Not in a frame or ready already called', e);
        }

        const response = await fetch(`/api/analyze-profile?fid=${window.userFid}&limit=150&include_replies=false`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          console.error('API error:', data.error, data.details);
          return;
        }
        
        // Log the text of each cast
        if (data.casts && data.casts.length > 0) {
          console.log(`Found ${data.casts.length} casts`);
        } else {
          console.log('No casts found');
        }
        
        // Set the user info
        if (data.userInfo) {
          setUserInfo(data.userInfo);
          console.log('User info:', data.userInfo);
        }
        
        // Set the analysis results
        if (data.analysis) {
          setAnalysis(data.analysis);
          console.log('Analysis:', data.analysis);
        }
        
        // Mark as analyzed to prevent re-analysis
        setHasAnalyzed(true);
      } catch (error) {
        console.error('Error fetching casts:', error);
        setError('Failed to fetch and analyze casts');
      } finally {
        setLoading(false);
      }
    };

    // Check for FID and fetch casts only once
    if (window.userFid && !hasAnalyzed) {
      fetchCasts();
    } else if (!window.userFid && !hasAnalyzed) {
      // Set up a limited number of retries for FID
      const maxRetries = 10;
      let retryCount = 0;
      
      const checkInterval = setInterval(() => {
        retryCount++;
        if (window.userFid) {
          clearInterval(checkInterval);
          fetchCasts();
        } else if (retryCount >= maxRetries) {
          clearInterval(checkInterval);
          setError('Could not get user information. Please try again.');
          setLoading(false);
        }
      }, 1000);
      
      return () => clearInterval(checkInterval);
    }
  }, [hasAnalyzed]);

  // Extract the category name without the description
  const getCategoryName = (category) => {
    if (!category) return '';
    return category.split(':')[0].trim();
  };
  
  // Remove "You are positioned at..." from the overview
  const formatOverview = (overview) => {
    if (!overview) return '';
    // Find the first sentence that starts with "You are positioned at" and remove it
    return overview.replace(/^You are positioned at.*?\.(\s|$)/i, '');
  };

  // Handle share button click
  const handleShare = async () => {
    if (!analysis || isSharing) return;
    
    try {
      setIsSharing(true);
      setShareResult(null);
      setShareSuccess(false);
      
      // Construct the URL with query parameters
      const url = new URL('/api/generate-share-image', window.location.origin);
      url.searchParams.set('x', analysis.xPosition);
      url.searchParams.set('y', analysis.yPosition);
      url.searchParams.set('category', analysis.category);
      
      if (userInfo) {
        if (userInfo.fid) url.searchParams.set('fid', userInfo.fid);
        if (userInfo.profilePicture) url.searchParams.set('profilePicture', userInfo.profilePicture);
        if (userInfo.username) {
          url.searchParams.set('username', userInfo.username);
        }
      }
      
      // Call the API
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        alert('Share image error: ' + data.error);
        setShareResult({ error: data.error });
      } else {
        // Create a Warpcast intent URL for sharing
        const categoryName = getCategoryName(analysis.category);
        const shareText = `I'm a ${categoryName} (${analysis.xPosition.toFixed(1)}, ${analysis.yPosition.toFixed(1)}) on the Onchain Alignment Chart! Check out your position:`;
        const shareUrl = data.imageUrl;
        
        const intentUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
        
        // Open the Warpcast intent URL
        try {
          await frame.sdk.actions.openUrl(intentUrl);
          setShareSuccess(true);
        } catch (intentError) {
          alert('Error opening Warpcast intent: ' + intentError.message);
          // Fallback to just showing the image URL
          setShareResult(data);
        }
      }
    } catch (error) {
      alert('Error generating share image: ' + error.message);
      setShareResult({ error: error.message });
    } finally {
      setIsSharing(false);
    }
  };

  // Handle mint button click
  const handleMint = async () => {
    try {
      setIsMinting(true);
      setMintStatus('preparing');
      setMintTxHash(null);
      setMintTokenId(null);
      
      const contractAddress = '0xEb11624eBa7973d415CEfB265ec1EC80ac114ddd';
      
      // Check if we're in a frame with wallet access
      if (!frame?.sdk?.wallet?.ethProvider) {
        alert('Wallet provider not available');
        throw new Error('Wallet provider not available. Please use Warpcast to mint.');
      }
      
      // Switch to Base network
      setMintStatus('switching');
      try {
        await frame.sdk.wallet.ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // Base mainnet chainId
        });
      } catch (switchError) {
        alert('Failed to switch network: ' + switchError.message);
        throw new Error('Failed to switch to Base network. Please try again.');
      }
      
      // Get current token ID before minting to handle race condition
      let currentTokenId;
      try {
        const tokenIdCallResult = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_call',
          params: [{
            to: contractAddress,
            data: '0x009a9b7b' // currentTokenId() function signature
          }, 'latest']
        });
        
        // Convert hex result to number
        currentTokenId = parseInt(tokenIdCallResult, 16);
        alert('Current token ID: ' + currentTokenId);
      } catch (tokenIdError) {
        alert('Error getting token ID: ' + tokenIdError.message);
        // Continue with minting even if we couldn't get the current token ID
      }
      
      // Get the user's wallet address
      setMintStatus('connecting');
      const accounts = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      });
      const walletAddress = accounts[0];
      
      // Create the mint function signature
      const mintFunctionSignature = '0x1249c58b'; // keccak256('mint()')
      
      // Send the transaction
      setMintStatus('minting');
      const txHash = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: contractAddress,
          data: mintFunctionSignature
        }]
      });
      
      setMintTxHash(txHash);
      setMintStatus('success');
      alert('Mint transaction sent: ' + txHash);
      
      // If we got the current token ID before minting, the new token ID should be the next one
      if (currentTokenId !== undefined) {
        const newTokenId = currentTokenId + 1;
        setMintTokenId(newTokenId);
        
        // Save to DB
        try {
          alert('Saving mint data for token ID: ' + newTokenId);
          const saveResponse = await fetch('/api/save-mint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokenId: newTokenId,
              txHash,
              walletAddress,
              x: analysis.xPosition,
              y: analysis.yPosition,
              category: analysis.category,
              fid: userInfo?.fid,
              username: userInfo?.username || 'Anonymous',
            }),
          });
          
          if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            alert('Save mint error: ' + errorText);
            throw new Error('Failed to save mint data: ' + errorText);
          }
          
          const saveData = await saveResponse.json();
          alert('Save mint success: ' + JSON.stringify(saveData));
        } catch (saveError) {
          alert('Error saving mint data: ' + saveError.message);
          // Don't throw here, we still want to show success for the mint
        }
      }
      
    } catch (error) {
      alert('Error minting NFT: ' + error.message);
      setMintStatus('error');
      setMintTxHash(null);
    } finally {
      setIsMinting(false);
    }
  };

  // Full-screen loading overlay
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-t-purple-500 border-purple-200 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Analyzing...</h2>
        <p className="text-sm text-gray-500 mt-2">Examining onchain activity</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full py-4 text-center">
        <h1 className="text-2xl font-bold">Onchain Alignment Chart</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {userInfo && (
          <div className="flex items-center justify-center mt-2">
            {userInfo.profilePicture && (
              <img 
                src={userInfo.profilePicture} 
                alt={userInfo.displayName || userInfo.username} 
                className="w-8 h-8 rounded-full mr-2 object-cover"
              />
            )}
            <span className="font-medium">
              {userInfo.displayName || userInfo.username || 'Anonymous User'}
            </span>
          </div>
        )}
      </header>
      <main className="flex flex-col items-center pt-4">
        <HomeComponent 
          position={analysis ? { x: analysis.xPosition, y: analysis.yPosition } : null} 
          profilePicture={userInfo?.profilePicture}
        />
        
        {analysis && (
          <div className="mt-8 w-full max-w-full px-[7.5%] pb-12">
            <div className="mb-6 text-center">
              <span className="inline-block px-4 py-1.5 bg-purple-100 rounded-full font-semibold text-purple-800 text-base">
                {getCategoryName(analysis.category)}
              </span>
              <p className="text-sm font-medium text-gray-700 mt-3">
                {analysis.category.split(':')[1]?.trim()}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-4 mb-8">
              <button
                onClick={handleShare}
                disabled={isSharing || shareSuccess}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : shareSuccess ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Shared
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </>
                )}
              </button>
              <button
                onClick={handleMint}
                disabled={isMinting || mintStatus === 'success'}
                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMinting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mintStatus === 'preparing' && 'Preparing...'}
                    {mintStatus === 'switching' && 'Switching to Base...'}
                    {mintStatus === 'connecting' && 'Connecting wallet...'}
                    {mintStatus === 'minting' && 'Minting...'}
                  </>
                ) : mintStatus === 'success' ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Minted
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Mint
                  </>
                )}
              </button>
            </div>
            
            {/* Share Success Message */}
            {shareSuccess && (
              <div className="text-center mb-6 p-3 rounded-md bg-green-100 text-green-800">
                <p className="font-medium">Your alignment chart has been shared to Warpcast!</p>
              </div>
            )}
            
            {/* Mint Status Display */}
            {(mintStatus === 'success' || mintStatus === 'error') && (
              <div className={`text-center mb-6 p-3 rounded-md ${mintStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {mintStatus === 'success' && (
                  <>
                    <p className="font-medium">Successfully minted your alignment NFT!</p>
                    {mintTxHash && (
                      <p className="text-sm mt-1">
                        Transaction: <a 
                          href={`https://basescan.org/tx/${mintTxHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-green-900"
                        >
                          {mintTxHash.slice(0,10)}...{mintTxHash.slice(-8)}
                        </a>
                      </p>
                    )}
                    {mintTokenId !== null && (
                      <p className="text-sm mt-1">Token ID: #{mintTokenId}</p>
                    )}
                    <p className="text-sm mt-3 font-medium">Check your Warplet for your NFT!</p>
                  </>
                )}
                {mintStatus === 'error' && (
                  <p className="font-medium">Failed to mint. Please try again later.</p>
                )}
              </div>
            )}
            
            {shareResult?.error && (
              <div className="text-center mb-4">
                <p className="text-red-500 text-sm">Error: {shareResult.error}</p>
              </div>
            )}
            
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">Your Onchain Alignment</h2>
              <p className="mb-4">{formatOverview(analysis.alignmentOverview)}</p>
              
              <h3 className="text-lg font-semibold mb-2">Supporting Evidence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {analysis.supportingEvidence.map((evidence, index) => (
                  <div key={index} className="border rounded p-3">
                    <h4 className="font-bold">{evidence.pattern}</h4>
                    <ul className="list-disc pl-5 my-2">
                      {evidence.phrases.map((phrase, i) => (
                        <li key={i} className="text-sm">{phrase}</li>
                      ))}
                    </ul>
                    <p className="text-sm">{evidence.explanation}</p>
                  </div>
                ))}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Quadrant Analysis</h3>
              <p>{analysis.quadrantAnalysis}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 