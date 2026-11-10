import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return new Response('Missing product ID', { status: 400 });
    }

    // Since this runs in edge runtime, we bypass server SDK node modules and fetch via Firestore REST API for maximum speed and compatibility.
    // Project ID is studio-3973035687-658c0
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/studio-3973035687-658c0/databases/(default)/documents/products/${id}`;
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
    const condition = fields?.condition?.stringValue || null;
    const gradingCompany = fields?.gradingCompany?.stringValue || null;
    const grade = fields?.grade?.stringValue || null;
    const year = fields?.year?.integerValue || fields?.year?.stringValue || null;
    const brand = fields?.brand?.stringValue || fields?.manufacturer?.stringValue || null;
    const cardSet = fields?.set?.stringValue || null;
    const cardNumber = fields?.cardNumber?.stringValue || null;
    const sellerId = fields?.sellerId?.stringValue || null;
    const sellerName = fields?.sellerName?.stringValue || 'Verified Seller';
    const imageUrl = fields?.imageUrls?.arrayValue?.values?.[0]?.stringValue || 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=1200';

    // Fetch seller location & PayID status if available
    let sellerLocation = 'Australia';
    let payIdReady = true;
    if (sellerId) {
      try {
        const sellerRes = await fetch(`https://firestore.googleapis.com/v1/projects/studio-3973035687-658c0/databases/(default)/documents/users/${sellerId}`);
        if (sellerRes.ok) {
          const sellerDoc = await sellerRes.json();
          const sFields = sellerDoc.fields;
          if (sFields?.location?.stringValue) sellerLocation = sFields.location.stringValue;
          if (sFields?.payIdReady?.booleanValue !== undefined) payIdReady = sFields.payIdReady.booleanValue;
        }
      } catch {
        // Fallback to defaults if seller lookup fails
      }
    }

    const isCard = /card/i.test(category);
    const gradeChip = gradingCompany && gradingCompany !== 'Raw'
      ? `${gradingCompany}${grade ? ` ${grade}` : ''}`
      : isCard ? 'Raw Card' : null;

    const chips = [
      gradeChip,
      condition,
      year ? String(year) : null,
      brand,
      cardSet,
      cardNumber ? `#${String(cardNumber).replace(/^#/, '')}` : null,
      size ? `Size ${size}` : null,
    ].filter((c): c is string => Boolean(c)).slice(0, 5);

    const paymentLine = `${payIdReady ? 'Pay by PayID or Cash' : 'Cash on Pickup'} · ${sellerLocation}`;

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
              backgroundColor: '#f97316',
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
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
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
                padding: '44px 48px',
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
                  {category} · Benched.au
                </span>
                <span
                  style={{
                    fontSize: '38px',
                    fontWeight: '900',
                    color: 'white',
                    lineHeight: '1.15',
                    letterSpacing: '-1px',
                  }}
                >
                  {title.length > 70 ? `${title.slice(0, 68)}…` : title}
                </span>

                {/* Fact Chips */}
                {chips.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: '18px',
                    }}
                  >
                    {chips.map((chip, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          padding: '6px 14px',
                          borderRadius: '999px',
                          backgroundColor: idx === 0 && gradingCompany && gradingCompany !== 'Raw' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                          color: idx === 0 && gradingCompany && gradingCompany !== 'Raw' ? '#0f172a' : '#e2e8f0',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                        }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>
                  Listed by {sellerName}
                </span>
                <span
                  style={{
                    fontSize: '64px',
                    fontWeight: '900',
                    color: 'white',
                    letterSpacing: '-2px',
                    lineHeight: '1',
                  }}
                >
                  ${Number(price).toLocaleString()} AUD
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#34d399',
                    marginTop: '6px',
                  }}
                >
                  ✓ {paymentLine}
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
