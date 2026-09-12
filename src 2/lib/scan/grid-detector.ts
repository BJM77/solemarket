import sharp from 'sharp';

export interface GridDetectionResult {
    rows: number;
    cols: number;
    cards: {
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
}

/**
 * Detect card grid layout from image
 * Defaults to 5x4 grid (20 cards) if auto-detection fails
 */
export async function detectCardGrid(
    imageBuffer: Buffer,
    targetCards: number = 20
): Promise<GridDetectionResult> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata');
    }

    // Calculate grid dimensions based on target card count
    // Common layouts: 4x5 (20), 5x5 (25), 5x6 (30), 6x5 (30)
    const gridLayouts = [
        { rows: 4, cols: 5, total: 20 },
        { rows: 5, cols: 4, total: 20 },
        { rows: 5, cols: 5, total: 25 },
        { rows: 5, cols: 6, total: 30 },
        { rows: 6, cols: 5, total: 30 },
        { rows: 6, cols: 6, total: 36 },
    ];

    // Find best matching layout
    const layout = gridLayouts.reduce((prev, curr) => {
        return Math.abs(curr.total - targetCards) < Math.abs(prev.total - targetCards)
            ? curr
            : prev;
    });

    const { rows, cols } = layout;
    const cardWidth = Math.floor(metadata.width / cols);
    const cardHeight = Math.floor(metadata.height / rows);

    // Generate bounding boxes for each card
    const cards = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            cards.push({
                x: col * cardWidth,
                y: row * cardHeight,
                width: cardWidth,
                height: cardHeight,
            });
        }
    }

    return {
        rows,
        cols,
        cards,
    };
}

/**
 * Crop individual card from image using bounding box
 */
export async function cropCard(
    imageBuffer: Buffer,
    boundingBox: { x: number; y: number; width: number; height: number }
): Promise<Buffer> {
    return sharp(imageBuffer)
        .extract({
            left: boundingBox.x,
            top: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
        })
        .toBuffer();
}

/**
 * Generate thumbnail from card image
 */
export async function generateThumbnail(
    cardBuffer: Buffer,
    maxWidth: number = 200
): Promise<Buffer> {
    return sharp(cardBuffer)
        .resize(maxWidth, null, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();
}
