import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const price = searchParams.get('price');
    const image = searchParams.get('image');
    
    // Default fallback values
    const displayTitle = title || 'Check out this listing on Benched';
    const displayPrice = price ? `$${price}` : '';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            backgroundColor: '#09090b', // zinc-950
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'sans-serif',
            color: 'white',
            padding: '40px',
          }}
        >
          {/* Top section: Brand/Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: '-0.05em',
              color: '#3b82f6', // primary blue
              textTransform: 'uppercase'
            }}>
              BENCHED
            </div>
            <div style={{ 
              marginLeft: '12px',
              backgroundColor: '#3b82f620',
              color: '#3b82f6',
              padding: '4px 12px',
              borderRadius: '99px',
              fontSize: 16,
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              Verified Listing
            </div>
          </div>

          {/* Middle section: Content */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
              <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em', textWrap: 'balance' }}>
                {displayTitle}
              </div>
              <div style={{ fontSize: 64, fontWeight: 900, color: '#10b981', marginTop: '20px' }}>
                {displayPrice}
              </div>
            </div>
            
            {image && (
              <div style={{ display: 'flex', width: '40%', height: '300px', borderRadius: '16px', overflow: 'hidden' }}>
                <img src={image} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
          
          {/* Bottom section: URL */}
          <div style={{ display: 'flex', color: '#71717a', fontSize: 24, fontWeight: 'bold' }}>
            benched.au
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(`OG Generation Error: ${e.message}`);
    return new Response('Failed to generate image', { status: 500 });
  }
}
