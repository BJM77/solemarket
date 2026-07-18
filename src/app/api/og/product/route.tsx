import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return new Response('Missing product ID', { status: 400 });
    }

    // Since this runs in edge runtime, we bypass server SDK node modules and fetch via Firestore REST API for maximum speed and compatibility.
    // Project ID is studio-3973035687-658c0
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/studio-3973035687-658c0/databases/(default)/documents/products/${productId}`;
    const res = await fetch(firestoreUrl);
    
    if (!res.ok) {
      return new Response('Product not found', { status: 404 });
    }

    const doc = await res.json();
    const fields = doc.fields;

    const title = fields?.title?.stringValue || 'Benched Listing';
    const price = fields?.price?.integerValue || fields?.price?.doubleValue || '0';
    const category = fields?.category?.stringValue || 'Collectibles';
    const size = fields?.size?.stringValue || null;
    const imageUrl = fields?.imageUrls?.arrayValue?.values?.[0]?.stringValue || 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=1200';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#020617',
            fontFamily: 'system-ui',
            padding: '40px',
            position: 'relative',
          }}
        >
          {/* Accent light glows */}
          <div
            style={{
              position: 'absolute',
              top: '-150px',
              left: '-150px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              backgroundColor: '#f26c0d',
              opacity: '0.15',
              filter: 'blur(80px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-150px',
              right: '-150px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              opacity: '0.1',
              filter: 'blur(80px)',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Left side details */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                flex: 1,
                padding: '50px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#f26c0d',
                    letterSpacing: '2px',
                    marginBottom: '10px',
                  }}
                >
                  {category}
                </span>
                <span
                  style={{
                    fontSize: '44px',
                    fontWeight: '900',
                    color: 'white',
                    lineHeight: '1.1',
                    letterSpacing: '-1px',
                  }}
                >
                  {title}
                </span>
                {size && (
                  <span
                    style={{
                      fontSize: '18px',
                      color: '#94a3b8',
                      marginTop: '15px',
                      fontWeight: '500',
                    }}
                  >
                    Size: {size}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Suggested Price
                </span>
                <span
                  style={{
                    fontSize: '64px',
                    fontWeight: 'bold',
                    color: 'white',
                    letterSpacing: '-2px',
                  }}
                >
                  ${Number(price).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Right side product image wrapper */}
            <div
              style={{
                display: 'flex',
                width: '500px',
                height: '100%',
                position: 'relative',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <img
                src={imageUrl}
                alt={title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '30px',
                  right: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#f26c0d',
                  padding: '10px 20px',
                  borderRadius: '15px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Benched
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error: any) {
    console.error('Error generating OG image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
