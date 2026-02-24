import { ImageResponse } from 'next/og';
import { getProductById } from '@/lib/firebase/firestore';

export const runtime = 'nodejs';

export const alt = 'Benched Product Image';
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
        <div style={{
          fontSize: 48,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          Benched Marketplace
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: '#111111',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '40px',
        }}
      >
        {/* Background Accent */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            background: '#F26A21',
            borderRadius: '50%',
            opacity: 0.15,
            filter: 'blur(100px)',
          }}
        />

        {/* Product Image */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '400px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <img
            src={product.imageUrls[0]}
            alt={product.title}
            style={{
              height: '100%',
              maxWidth: '80%',
              objectFit: 'contain',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>

        {/* Product Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#F26A21', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                {product.category === 'Trading Cards' ? 'Authenticated Card' : 'Authenticated Kicks'}
              </span>
              <span style={{ fontSize: '48px', fontWeight: 900, maxWidth: '800px', lineHeight: 1.1 }}>
                {product.title}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                Buy Now
              </span>
              <span style={{ fontSize: '64px', fontWeight: 900, color: 'white' }}>
                ${product.price}
              </span>
            </div>
          </div>
        </div>

        {/* Logo / Badge */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '12px 24px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ color: 'white', fontSize: '24px', fontWeight: 900, letterSpacing: '1px' }}>
            BENCHED
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
