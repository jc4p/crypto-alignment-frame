import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

// Load Inter font from our CDN
const interRegular = fetch(
  new URL('https://images.kasra.codes/Inter_18pt-Regular.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

const interMedium = fetch(
  new URL('https://images.kasra.codes/Inter_18pt-Medium.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

const interBold = fetch(
  new URL('https://images.kasra.codes/Inter_18pt-Bold.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

export async function GET(request) {
  try {
    // Load fonts
    const [interRegularData, interMediumData, interBoldData] = await Promise.all([
      interRegular,
      interMedium,
      interBold,
    ]);

    const { searchParams } = new URL(request.url);
    
    // Get parameters from the request
    const xPosition = parseFloat(searchParams.get('x') || '0');
    const yPosition = parseFloat(searchParams.get('y') || '0');
    const category = searchParams.get('category') || 'Builder-Pragmatist';
    const profilePicture = searchParams.get('profilePicture') || '';
    const username = searchParams.get('username') || 'Anonymous';
    
    // Calculate marker position as percentage of grid (similar to HomeComponent)
    const markerPositionX = ((xPosition + 10) / 20) * 100;
    const markerPositionY = ((10 - yPosition) / 20) * 100;
    
    // Get category name without description
    const categoryName = category.split(':')[0].trim();
    
    // Generate grid lines
    const gridLines = [];
    // Vertical grid lines
    for (let i = 1; i < 20; i++) {
      const position = (i / 20) * 100;
      gridLines.push(
        <div
          key={`v-${i}`}
          style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: `${position}%`,
            width: '1px',
            backgroundColor: '#e5e7eb', // gray-200
            display: 'flex',
          }}
        />
      );
    }
    // Horizontal grid lines
    for (let i = 1; i < 20; i++) {
      const position = (i / 20) * 100;
      gridLines.push(
        <div
          key={`h-${i}`}
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            top: `${position}%`,
            height: '1px',
            backgroundColor: '#e5e7eb', // gray-200
            display: 'flex',
          }}
        />
      );
    }
    
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '1000px',
            height: '1000px',
            backgroundColor: 'white',
            padding: '40px',
            fontFamily: '"Inter 18pt", sans-serif',
          }}
        >
          {/* Header with user info */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '10px',
            width: '100%'
          }}>
            {profilePicture && (
              <img
                src={profilePicture}
                width="48"
                height="48"
                style={{ 
                  borderRadius: '50%',
                  marginRight: '12px',
                  objectFit: 'cover'
                }}
                alt={username}
              />
            )}
            <div style={{ 
              fontSize: '32px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              @{username}'s Onchain Alignment
            </div>
          </div>
          
          {/* Category Label */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}>
            <div style={{ 
              padding: '8px 20px',
              borderRadius: '9999px',
              fontWeight: '600',
              fontSize: '28px',
              color: '#6b21a8', // purple-800
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {categoryName}
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#6b7280', // gray-600
              textAlign: 'center',
            }}>
              {category.split(':')[1]?.trim()}
            </div>
          </div>
          
          {/* Grid Container */}
          <div style={{ 
            width: '700px',
            height: '700px',
            position: 'relative',
            border: '2px solid black',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '40px',
          }}>
            {/* Grid Lines */}
            {gridLines}
            
            {/* X and Y Axes */}
            <div style={{ 
              position: 'absolute',
              left: '0',
              right: '0',
              top: '50%',
              height: '2px',
              backgroundColor: 'black',
              display: 'flex',
            }} />
            <div style={{ 
              position: 'absolute',
              top: '0',
              bottom: '0',
              left: '50%',
              width: '2px',
              backgroundColor: 'black',
              display: 'flex',
            }} />
            
            {/* User Position Marker */}
            <div style={{ 
              position: 'absolute',
              left: `${markerPositionX}%`,
              top: `${markerPositionY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{ 
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #8b5cf6', // purple-500
                backgroundColor: profilePicture ? 'transparent' : '#8b5cf6',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {profilePicture && (
                  <img
                    src={profilePicture}
                    width="48"
                    height="48"
                    style={{ objectFit: 'cover' }}
                    alt={username}
                  />
                )}
              </div>
              <div style={{ 
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                ({xPosition.toFixed(1)}, {yPosition.toFixed(1)})
              </div>
            </div>
            
            {/* Alignment Labels */}
            <div style={{ 
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#dbeafe', // blue-100
              padding: '4px 8px',
              borderRadius: '9999px',
              fontWeight: '500',
              fontSize: '16px',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              Builder
            </div>
            
            <div style={{ 
              position: 'absolute',
              left: '100%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fee2e2', // red-100
              padding: '4px 8px',
              borderRadius: '9999px',
              fontWeight: '500',
              fontSize: '16px',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              Speculator
            </div>
            
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#dcfce7', // green-100
              padding: '4px 8px',
              borderRadius: '9999px',
              fontWeight: '500',
              fontSize: '16px',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              Pragmatist
            </div>
            
            <div style={{ 
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fef9c3', // yellow-100
              padding: '4px 8px',
              borderRadius: '9999px',
              fontWeight: '500',
              fontSize: '16px',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              Decentralist
            </div>
          </div>
        </div>
      ),
      {
        width: 1000,
        height: 1000,
        fonts: [
          {
            name: 'Inter 18pt',
            data: interRegularData,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Inter 18pt',
            data: interMediumData,
            weight: 500,
            style: 'normal',
          },
          {
            name: 'Inter 18pt',
            data: interBoldData,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error('Error generating NFT image:', error);
    return new Response(`Failed to generate image: ${error.message}`, {
      status: 500,
    });
  }
} 