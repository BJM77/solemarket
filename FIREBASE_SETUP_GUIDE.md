# 🔥 Complete Firebase Setup Guide for Listings & Images
**Project:** Picksy Marketplace  
**Date:** 2026-01-23  
**Firebase Project:** studio-8322868971-8ca89

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Firestore Database Structure](#firestore-database-structure)
3. [Firestore Security Rules](#firestore-security-rules)
4. [Firestore Indexes](#firestore-indexes)
5. [Storage Structure for Images](#storage-structure-for-images)
6. [Storage Security Rules](#storage-security-rules)
7. [Storage CORS Configuration](#storage-cors-configuration)
8. [Deployment Commands](#deployment-commands)
9. [Testing Your Setup](#testing-your-setup)

---

## Overview

Your marketplace uses **two Firebase services** to store listings and images:

### 1. **Firestore Database** (for listing data)
- Stores product/listing metadata (title, price, description, etc.)
- Stores **image URLs** (references to files in Storage)
- Fast queries for browsing, filtering, and searching

### 2. **Firebase Storage** (for image files)
- Stores actual image files (JPEG, PNG, WebP)
- Provides public URLs for images
- Handles file uploads with validation (size, type)

**Flow:**
```
User uploads listing → Images saved to Storage → Image URLs saved to Firestore
```

---

## Firestore Database Structure

### Collection: `products`
This is where all listings are stored. Each document represents one listing.

#### ✅ **Correct Document Structure**

```javascript
products/{productId} = {
  // BASIC INFORMATION
  id: "abc123def456",                    // Document ID
  title: "2023 Pokémon Charizard PSA 10", // Product title
  description: "Mint condition...",       // Full description
  
  // PRICING
  price: 299.99,                          // Current/sale price (number)
  originalPrice: 349.99,                  // Optional original price
  
  // SELLER INFO
  sellerId: "user123",                    // User ID of seller
  sellerName: "John's Cards",             // Display name
  sellerEmail: "john@example.com",        // Email
  sellerAvatar: "https://...",            // Avatar URL
  
  // IMAGES (CRITICAL!)
  imageUrls: [                            // Array of Storage URLs
    "https://firebasestorage.googleapis.com/.../image1.jpg",
    "https://firebasestorage.googleapis.com/.../image2.jpg",
    "https://firebasestorage.googleapis.com/.../image3.jpg"
  ],
  
  // CATEGORIZATION
  category: "Sports Cards",               // Main category
  subCategory: "Pokémon",                 // Sub-category
  
  // CONDITION & GRADING
  condition: "Mint",                      // Raw condition
  gradingCompany: "PSA",                  // PSA, BGS, CGC, SGC, Raw
  grade: "10",                            // Grade number
  certNumber: "12345678",                 // Certificate number
  
  // PRODUCT DETAILS
  year: 2023,                             // Release year
  manufacturer: "Pokémon Company",        // Brand
  cardNumber: "006/165",                  // Card number
  quantity: 1,                            // Stock quantity
  
  // STATUS
  status: "available",                    // available, sold, draft
  isDraft: false,                         // Is it a draft?
  isPrivate: false,                       // Private collection item?
  
  // TIMESTAMPS (IMPORTANT!)
  createdAt: Timestamp(2024-01-15 10:30:00),  // When created
  updatedAt: Timestamp(2024-01-15 10:30:00),  // Last updated
  soldAt: null,                                // When sold (if sold)
  
  // ENGAGEMENT
  views: 125,                             // Total views
  uniqueViews: 87,                        // Unique user views
  viewedByUsers: ["user1", "user2"],      // Array of user IDs
  
  // AUCTION FIELDS (Optional)
  isAuction: false,                       // Is it an auction?
  startingBid: null,                      // Starting bid amount
  currentBid: null,                       // Current highest bid
  auctionEndTime: null,                   // When auction ends
  buyItNowPrice: null,                    // Buy-it-now price
  
  // REVERSE BIDDING (Optional)
  isReverseBidding: false,                // Accept offers?
  bids: [],                               // Array of bid objects
  acceptedBidId: null,                    // Accepted bid ID
}
```

#### 🎯 **Image URLs Field - CRITICAL**

The `imageUrls` field is an **array of strings** containing full Firebase Storage URLs:

```javascript
imageUrls: [
  "https://firebasestorage.googleapis.com/v0/b/your-bucket/o/products%2FuserId%2FproductId%2Fimage1.jpg?alt=media&token=abc123",
  "https://firebasestorage.googleapis.com/v0/b/your-bucket/o/products%2FuserId%2FproductId%2Fimage2.jpg?alt=media&token=def456"
]
```

**Each URL contains:**
- Bucket name: `studio-8322868971-8ca89.appspot.com`
- File path: `products/{userId}/{productId}/image1.jpg`
- Access token: For public access

---

## Firestore Security Rules

### ✅ **Current Rules (Already Configured)**

Your `firestore.rules` file is **already well-configured** for products:

```javascript
// Line 18-24: Product rules
match /products/{productId} {
  // ✅ Anyone can read listings
  allow read: if true;
  
  // ✅ Only authenticated users can create listings
  // ✅ Must set their own sellerId
  // ✅ Price must be greater than 0
  allow create: if isSignedIn()
                && request.resource.data.sellerId == request.auth.uid
                && request.resource.data.price > 0;
  
  // ✅ Only seller or admin can update/delete
  allow update, delete: if isSignedIn() 
                        && (resource.data.sellerId == request.auth.uid 
                            || isSuperAdmin());
}
```

### ⚠️ **Recommended Enhancements**

Add validation to ensure data quality:

```javascript
match /products/{productId} {
  allow read: if true;
  
  allow create: if isSignedIn()
                && request.resource.data.sellerId == request.auth.uid
                && request.resource.data.price > 0
                && request.resource.data.title is string
                && request.resource.data.title.size() > 0
                && request.resource.data.description is string
                && request.resource.data.imageUrls is list
                && request.resource.data.imageUrls.size() > 0  // At least 1 image
                && request.resource.data.category is string;
  
  allow update: if isSignedIn() 
                && (resource.data.sellerId == request.auth.uid || isSuperAdmin())
                && request.resource.data.sellerId == resource.data.sellerId  // Can't change seller
                && request.resource.data.price > 0;
  
  allow delete: if isSignedIn() 
                && (resource.data.sellerId == request.auth.uid || isSuperAdmin());
}
```

---

## Firestore Indexes

### ✅ **Current Indexes (Already Configured)**

Your `firestore.indexes.json` file already has **excellent indexes** for:
- Filtering by draft status + creation date
- Sorting by price (ascending/descending)
- Filtering by category + various combinations
- Filtering by subcategory
- Searching by seller

### 📝 **Recommended Additional Index**

For better image-related queries, add:

```json
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "imageUrls",
      "arrayConfig": "CONTAINS"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

This allows queries like "find all available products with images, sorted by date."

---

## Storage Structure for Images

### ✅ **Recommended Folder Structure**

```
studio-8322868971-8ca89.appspot.com/
├── products/                          # Product images
│   ├── {userId}/                      # Organized by seller
│   │   ├── {productId}/               # Each product has its own folder
│   │   │   ├── image1.jpg             # Original images
│   │   │   ├── image2.jpg
│   │   │   ├── image3.jpg
│   │   │   └── thumbnail/             # Optional thumbnails
│   │   │       ├── image1_thumb.jpg
│   │   │       └── image2_thumb.jpg
│   │   └── {productId2}/
│   │       └── ...
│   └── {userId2}/
│       └── ...
├── verification-docs/                 # User verification documents
│   └── {userId}/
│       ├── id_front.jpg
│       └── id_back.jpg
└── media-library/                     # General media assets
    ├── banners/
    └── icons/
```

### 🎯 **File Naming Convention**

```javascript
// Product image path format:
products/{userId}/{productId}/image_{timestamp}.jpg

// Example:
products/abc123/prod456/image_1706012345678.jpg

// Or with descriptive names:
products/abc123/prod456/charizard_front.jpg
products/abc123/prod456/charizard_back.jpg
products/abc123/prod456/charizard_cert.jpg
```

### 📸 **Supported Image Formats**

```javascript
✅ JPEG (.jpg, .jpeg)  - Recommended for photos
✅ PNG (.png)          - Good for logos, transparent images
✅ WebP (.webp)        - Modern format, smaller size
⚠️ GIF (.gif)          - Supported but not ideal for listings
❌ BMP, TIFF          - NOT recommended (too large)
```

### 💾 **Image Size Limits**

Current limit in your `storage.rules`:
```javascript
// Line 10-11
function isSizeValid() {
  return request.resource.size < 5 * 1024 * 1024;  // 5MB per file
}
```

**Recommendations:**
- **Product photos**: 1-3MB (compressed)
- **Thumbnail**: 50-200KB
- **Maximum**: 5MB (your current limit)

---

## Storage Security Rules

### ✅ **Current Rules (Already Configured)**

```javascript
// Line 16-22: Product images
match /products/{userId}/{allPaths=**} {
  // ✅ Anyone can read product images
  allow read: if true;
  
  // ✅ Only the user who owns the folder can upload
  // ✅ Must be an image file
  // ✅ Must be under 5MB
  allow write: if request.auth != null 
               && request.auth.uid == userId
               && isImage()
               && isSizeValid();
}
```

This is **perfect** for your use case! It ensures:
1. **Public read**: Anyone can view product images (required for marketplace)
2. **Restricted write**: Only the seller can upload to their folder
3. **Type validation**: Only image files allowed
4. **Size validation**: Max 5MB per file

### ⚠️ **Optional Enhancement**: Super Admin Override

If you want admins to manage all images:

```javascript
match /products/{userId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null 
               && (request.auth.uid == userId || isSuperAdmin())
               && isImage()
               && isSizeValid();
}

// Add this helper function at the top:
function isSuperAdmin() {
  return request.auth.token.admin == true 
         || request.auth.uid == 'O5nCLgbIaRRRF369K0kjgT59io73';
}
```

---

## Storage CORS Configuration

### ✅ **Current CORS (Already Applied)**

Your `storage.cors.json` is correctly configured:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

This works, but for **production**, tighten security:

```json
[
  {
    "origin": [
      "http://localhost:9004",
      "http://localhost:3000",
      "https://your-production-domain.com",
      "https://studio-8322868971-8ca89.firebaseapp.com",
      "https://picksy.com"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

**To apply CORS:**
```bash
gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.appspot.com
```

---

## Deployment Commands

### 🚀 **Deploy Firestore Rules & Indexes**

```bash
# Deploy Security Rules
firebase deploy --only firestore:rules

# Deploy Indexes
firebase deploy --only firestore:indexes

# Deploy both at once
firebase deploy --only firestore
```

### 🚀 **Deploy Storage Rules**

```bash
firebase deploy --only storage
```

### 🚀 **Apply Storage CORS**

```bash
# Make sure you have gsutil installed (comes with Firebase CLI)
gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.appspot.com
```

### 🚀 **Deploy Everything**

```bash
# Deploy all Firebase services
firebase deploy
```

---

## Testing Your Setup

### ✅ **Test Checklist**

#### 1. **Test Product Creation**
```javascript
// In your app, create a test listing:
const product = {
  title: "Test Listing",
  description: "Testing image upload",
  price: 99.99,
  category: "Test",
  sellerId: currentUser.uid,
  sellerName: currentUser.displayName,
  sellerEmail: currentUser.email,
  imageUrls: [], // Will be populated after upload
  status: "draft",
  isDraft: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

const docRef = await addDoc(collection(db, "products"), product);
```

#### 2. **Test Image Upload**
```javascript
// Upload images to Storage
const userId = currentUser.uid;
const productId = docRef.id;
const file = /* user selected file */;

// Create storage reference
const storageRef = ref(storage, `products/${userId}/${productId}/${file.name}`);

// Upload file
const uploadResult = await uploadBytes(storageRef, file);

// Get download URL
const imageUrl = await getDownloadURL(uploadResult.ref);

// Update Firestore with image URL
await updateDoc(doc(db, "products", productId), {
  imageUrls: arrayUnion(imageUrl),
  updatedAt: serverTimestamp()
});
```

#### 3. **Test Image Access**
- Open a product listing in browser
- Check if images load without CORS errors
- Verify images are publicly accessible

#### 4. **Test Security Rules**
- Try creating a product WITHOUT authentication → Should FAIL
- Try updating someone else's product → Should FAIL
- Try uploading to someone else's folder → Should FAIL

---

## 🎯 **Quick Setup Commands**

Run these commands in order to ensure everything is deployed:

```bash
# 1. Navigate to project directory
cd /Users/bjm/Desktop/Pick1901

# 2. Deploy Firestore rules and indexes
firebase deploy --only firestore

# 3. Deploy Storage rules
firebase deploy --only storage

# 4. Apply Storage CORS (if you have gsutil)
gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.appspot.com

# 5. Verify deployment
firebase projects:list
firebase firestore:indexes:list
```

---

## 📊 **Current Status Summary**

| Component | Status | Notes |
|-----------|--------|-------|
| **Firestore Rules** | ✅ Excellent | Product rules are secure and well-configured |
| **Firestore Indexes** | ✅ Excellent | Comprehensive indexes for all query patterns |
| **Storage Rules** | ✅ Good | Public read, restricted write, validated uploads |
| **Storage CORS** | ⚠️ Too Open | Works but should be restricted for production |
| **Image Structure** | ✅ Perfect | Organized by user → product → images |
| **Data Model** | ✅ Excellent | Product type includes all necessary fields |

---

## 🚨 **Common Issues & Solutions**

### Issue: "CORS Error when uploading images"
**Solution:** Apply CORS configuration:
```bash
gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.appspot.com
```

### Issue: "Permission denied when creating product"
**Solution:** Ensure user is authenticated and `sellerId` matches `auth.uid`

### Issue: "Missing or insufficient permissions"
**Solution:** Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

### Issue: "Index not found"
**Solution:** Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

### Issue: "Images not loading"
**Solution:** 
1. Check image URLs are valid Firebase Storage URLs
2. Verify Storage rules allow public read
3. Check CORS is configured
4. Ensure images are in correct folder structure

---

## 📝 **Summary**

Your Firebase setup is already **90% correct**! Here's what you have:

✅ **Firestore Database**: Perfect structure for listings  
✅ **Firestore Rules**: Secure and well-designed  
✅ **Firestore Indexes**: Comprehensive query support  
✅ **Storage Structure**: Organized and scalable  
✅ **Storage Rules**: Secure with proper validation  
⚠️ **CORS**: Works but should be tightened for production

**Action Items:**
1. Deploy current rules if not already deployed
2. Tighten CORS for production domains
3. Test image upload flow thoroughly
4. Monitor Firestore usage in Firebase Console

Your settings are excellent for a marketplace application! 🎉

---

*Last Updated: 2026-01-23*  
*Firebase Project: studio-8322868971-8ca89*
