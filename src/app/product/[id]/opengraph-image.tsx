
import { ImageResponse } from 'next/og';
import { getProductById } from '@/lib/firebase/firestore';

export const runtime = 'nodejs';
export const alt = 'Picksy Product Listing';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';


export default async function Image({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(to bottom right, #111827, #4b5563)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          Picksy Marketplace
        </div>
      ),
      { ...size }
    );
  }

  const price = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(product.price);

  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left Side: Product Image */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
            <img
                src={product.imageUrls?.[0] || ''}
                alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
        </div>

        {/* Right Side: Details */}
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px',
            background: 'linear-gradient(135deg, hsl(222.2, 47.4%, 11.2%) 0%, hsl(210, 40%, 96.1%) 100%)',
            color: 'white'
        }}>
          {/* Logo / Brand */}
          <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 20, color: 'hsl(210, 40%, 98%)' }}>
            Picksy
          </div>

          {/* Title */}
          <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 20, lineHeight: 1.1, color: 'white' }}>
            {product.title.substring(0, 60)}{product.title.length > 60 ? '...' : ''}
          </div>

          {/* Condition Badge */}
           {product.condition && (
            <div style={{
                display: 'flex',
                backgroundColor: 'hsla(0, 0%, 100%, 0.1)',
                padding: '8px 16px',
                borderRadius: 50,
                width: 'fit-content',
                marginBottom: 40,
                fontSize: 24,
                color: 'white',
                border: '1px solid hsla(0, 0%, 100%, 0.2)'
            }}>
              {product.condition}
            </div>
           )}

          {/* Price */}
          <div style={{ fontSize: 64, fontWeight: 'bold', color: 'white' }}>
            {price}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', fontSize: 20, color: 'hsla(0, 0%, 100%, 0.7)' }}>
            Verified • Secure • Local
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
