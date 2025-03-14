"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const HomeComponent = ({ position, profilePicture }) => {
  const [windowWidth, setWindowWidth] = useState(0);
  
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