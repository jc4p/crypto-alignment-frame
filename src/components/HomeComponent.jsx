"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const HomeComponent = ({ position, profilePicture, friends = [] }) => {
  const [windowWidth, setWindowWidth] = useState(0);
  const [adjustedFriends, setAdjustedFriends] = useState([]);
  
  useEffect(() => {
    // Set initial window width
    setWindowWidth(window.innerWidth);
    
    // Update window width on resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Calculate marker position as percentage of grid
  const markerPosition = position ? {
    left: `${((position.x + 10) / 20) * 100}%`,
    top: `${((10 - position.y) / 20) * 100}%`,
  } : null;
  
  // Calculate positions for friend markers
  const calculateFriendPosition = (x, y) => ({
    left: `${((x + 10) / 20) * 100}%`,
    top: `${((10 - y) / 20) * 100}%`,
  });
  
  // Apply collision avoidance
  useEffect(() => {
    if (!friends || friends.length === 0) {
      setAdjustedFriends([]);
      return;
    }
    
    // Helper function to check if two positions are too close
    const isTooClose = (pos1, pos2, threshold = 0.5) => {
      const distanceSquared = 
        Math.pow(pos1.position.x - pos2.position.x, 2) + 
        Math.pow(pos1.position.y - pos2.position.y, 2);
      return distanceSquared < threshold;
    };
    
    // Clone friends array to avoid modifying original
    const adjustedFriendsArr = friends.map(friend => ({...friend}));
    
    // Get friends with valid positions
    const validFriends = adjustedFriendsArr.filter(
      friend => friend.position && typeof friend.position.x === 'number' && typeof friend.position.y === 'number'
    );
    
    // Apply repulsion for overlapping points
    for (let i = 0; i < validFriends.length; i++) {
      for (let j = i + 1; j < validFriends.length; j++) {
        if (isTooClose(validFriends[i], validFriends[j])) {
          // Calculate repulsion vector
          const dx = validFriends[j].position.x - validFriends[i].position.x;
          const dy = validFriends[j].position.y - validFriends[i].position.y;
          
          // Normalize and scale
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001; // Avoid division by zero
          const repulsionForce = 0.3; // Adjust strength of repulsion
          
          // Apply small adjustments in opposite directions
          validFriends[i].position = {
            x: validFriends[i].position.x - (dx / dist * repulsionForce),
            y: validFriends[i].position.y - (dy / dist * repulsionForce)
          };
          
          validFriends[j].position = {
            x: validFriends[j].position.x + (dx / dist * repulsionForce),
            y: validFriends[j].position.y + (dy / dist * repulsionForce)
          };
          
          // Ensure we stay in the same quadrant
          const keepInQuadrant = (friend) => {
            const originalQuadrantX = Math.sign(friend.position.x);
            const originalQuadrantY = Math.sign(friend.position.y);
            
            // If we've crossed an axis, pull back
            if (Math.sign(friend.position.x) !== originalQuadrantX && originalQuadrantX !== 0) {
              friend.position.x = originalQuadrantX * 0.1; // Small distance from axis
            }
            
            if (Math.sign(friend.position.y) !== originalQuadrantY && originalQuadrantY !== 0) {
              friend.position.y = originalQuadrantY * 0.1; // Small distance from axis
            }
            
            // Constrain within grid boundaries (-10 to 10)
            friend.position.x = Math.max(-9.9, Math.min(9.9, friend.position.x));
            friend.position.y = Math.max(-9.9, Math.min(9.9, friend.position.y));
          };
          
          keepInQuadrant(validFriends[i]);
          keepInQuadrant(validFriends[j]);
        }
      }
    }
    
    setAdjustedFriends(adjustedFriendsArr);
  }, [friends]);
  
  const friendsToRender = adjustedFriends.length > 0 ? adjustedFriends : friends;
  
  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Grid Container with padding for labels */}
      <div className="w-[80%] max-w-[500px] mx-auto py-6 px-4">
        <div className="aspect-square relative border-2 border-black">
          {/* Grid Background */}
          <div className="absolute inset-0 grid grid-cols-[repeat(20,1fr)] grid-rows-[repeat(20,1fr)]">
            {/* Generate grid cells */}
            {Array.from({ length: 400 }).map((_, index) => (
              <div key={index} className="border border-gray-100"></div>
            ))}
          </div>
          
          {/* X and Y Axes */}
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-black"></div>
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-black"></div>
          
          {/* Friend Position Markers */}
          {friendsToRender && friendsToRender.length > 0 && friendsToRender.map((friend, index) => {
            if (!friend.position || !friend.position.x || !friend.position.y) return null;
            
            const friendPos = calculateFriendPosition(friend.position.x, friend.position.y);
            const friendName = friend.display_name || friend.username || 'Friend';
            
            return (
              <div 
                key={`friend-${index}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-5"
                style={{ 
                  left: friendPos.left,
                  top: friendPos.top,
                }}
                title={friendName}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden border-2 border-blue-500">
                  {friend.profile_picture ? (
                    <img 
                      src={friend.profile_picture} 
                      alt={friendName} 
                      className="w-full h-full object-cover"
                    />
                  ) : friend.image_url ? (
                    <img 
                      src={friend.image_url} 
                      alt={friendName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500"></div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* User Position Marker */}
          {position && markerPosition && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ 
                left: markerPosition.left,
                top: markerPosition.top,
              }}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500">
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt="User" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-500"></div>
                )}
              </div>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-sm">
                ({position.x.toFixed(1)}, {position.y.toFixed(1)})
              </div>
            </div>
          )}
          
          {/* Alignment Labels */}
          <div className="absolute px-2 py-0.5 bg-blue-100 rounded-full font-medium text-center text-xs"
            style={{ 
              left: 0, 
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            Builder
          </div>
          
          <div className="absolute px-2 py-0.5 bg-red-100 rounded-full font-medium text-center text-xs"
            style={{ 
              left: '100%', 
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            Speculator
          </div>
          
          <div className="absolute px-2 py-0.5 bg-green-100 rounded-full font-medium text-center text-xs"
            style={{ 
              top: -12, 
              left: '50%',
              transform: 'translate(-50%, 0)'
            }}
          >
            Pragmatist
          </div>
          
          <div className="absolute px-2 py-0.5 bg-yellow-100 rounded-full font-medium text-center text-xs"
            style={{ 
              bottom: -12, 
              left: '50%',
              transform: 'translate(-50%, 0)'
            }}
          >
            Decentralist
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeComponent; 