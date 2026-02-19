// Run with: npx ts-node scripts/generate-dummy-data.ts
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRANDS = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'Puma', 'Asics'];
const CONDITIONS = ['New', 'Used - Excellent', 'Used - Good', 'Used - Fair'];
const CATEGORIES = ['Sneakers', 'Trading Cards', 'Apparel'];

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateProducts(count: number) {
    const products = [];
    for (let i = 0; i < count; i++) {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
        const price = Math.floor(Math.random() * 500) + 50;
        
        products.push({
            id: `prod_${Math.random().toString(36).substr(2, 9)}`,
            title: `${brand} ${category === 'Sneakers' ? 'Air Max' : 'Item'} ${Math.floor(Math.random() * 90) + 1}`,
            description: `A great pair of ${brand} shoes. Condition is excellent.`,
            price: price,
            category: category,
            brand: brand,
            condition: CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
            quantity: Math.floor(Math.random() * 5) + 1,
            sellerId: 'user_123', // Dummy seller
            images: [`https://placehold.co/600x400?text=${brand}+${i}`],
            createdAt: randomDate(new Date(2024, 0, 1), new Date()),
            status: 'available'
        });
    }
    return products;
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const products = generateProducts(50);
fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(products, null, 2));

console.log(`✅ Generated ${products.length} dummy products in data/products.json`);
