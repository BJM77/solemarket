# 🎯 Quick Reference: Firebase Listings & Images Setup

## 📊 How It All Works Together

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOADS LISTING                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Your Web App   │
                    │  (Next.js App)   │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────┐      ┌───────────────────┐
    │  FIREBASE STORAGE │      │ FIRESTORE DATABASE│
    │   (Image Files)   │      │  (Listing Data)   │
    └───────────────────┘      └───────────────────┘
                │                           │
                │                           │
    1. Upload images to:         2. Save listing to:
       products/{userId}/           products/{docId}
       {productId}/                    ↓
       image1.jpg                   {
                                      title: "...",
       ↓                              price: 99.99,
    Get download URLs:                imageUrls: [
       https://firebasestorage...         "url1",
                                          "url2"
                                       ]
                                    }
```

---

## ✅ Your Current Setup Status

| Component | Status | Action Needed |
|-----------|--------|---------------|
| **Firestore Rules** | ✅ Configured | Deploy with script |
| **Firestore Indexes** | ✅ Configured | Deploy with script |
| **Storage Rules** | ✅ Configured | Deploy with script |
| **Storage CORS** | ✅ Configured | Deploy with script |
| **Product Schema** | ✅ Defined | Already in code |
| **Image Upload Logic** | ✅ In place | Already in code |

---

## 🚀 ONE-COMMAND DEPLOY

Run this to deploy everything:

```bash
./deploy-firebase.sh
```

Or manually:

```bash
# Deploy Firestore (rules + indexes)
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Apply CORS (requires gsutil)
gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.appspot.com
```

---

## 📋 Product Document Example

```javascript
// What gets saved to Firestore:
{
  id: "abc123",
  title: "2023 Pokémon Charizard PSA 10",
  description: "Perfect mint condition...",
  price: 299.99,
  category: "Sports Cards",
  subCategory: "Pokémon",
  
  // SELLER INFO
  sellerId: "user123",
  sellerName: "John's Cards",
  sellerEmail: "john@example.com",
  
  // IMAGES - Array of Storage URLs
  imageUrls: [
    "https://firebasestorage.googleapis.com/v0/b/studio-8322868971-8ca89.appspot.com/o/products%2Fuser123%2Fabc123%2Fimage1.jpg?alt=media&token=xyz",
    "https://firebasestorage.googleapis.com/v0/b/studio-8322868971-8ca89.appspot.com/o/products%2Fuser123%2Fabc123%2Fimage2.jpg?alt=media&token=abc"
  ],
  
  // STATUS
  status: "available",
  isDraft: false,
  
  // TIMESTAMPS
  createdAt: Timestamp(2024-01-15),
  updatedAt: Timestamp(2024-01-15)
}
```

---

## 📁 Storage Path Structure

```
storage/
└── products/                    ← All product images
    ├── {userId1}/               ← Each seller has their own folder
    │   ├── {productId1}/        ← Each product has its own folder
    │   │   ├── image1.jpg       ← Individual images
    │   │   ├── image2.jpg
    │   │   └── image3.jpg
    │   └── {productId2}/
    │       └── ...
    └── {userId2}/
        └── ...
```

**Path Format:**
```
products/{sellerId}/{productId}/image_{timestamp}.jpg
```

**Example:**
```
products/O5nCLgbIaRRRF369K0kjgT59io73/abc123def456/image_1706012345.jpg
```

---

## 🔒 Security Rules Summary

### Firestore (Database)

```javascript
// Products collection
match /products/{productId} {
  // ✅ Anyone can READ listings (public marketplace)
  allow read: if true;
  
  // ✅ Only authenticated users can CREATE
  // ✅ Must be their own sellerId
  // ✅ Price must be > 0
  allow create: if isSignedIn()
                && request.resource.data.sellerId == request.auth.uid
                && request.resource.data.price > 0;
  
  // ✅ Only seller or admin can UPDATE/DELETE
  allow update, delete: if isSignedIn() 
                        && (resource.data.sellerId == request.auth.uid 
                            || isSuperAdmin());
}
```

### Storage (Images)

```javascript
// Product images folder
match /products/{userId}/{allPaths=**} {
  // ✅ Anyone can READ images (public access)
  allow read: if true;
  
  // ✅ Only folder owner can WRITE
  // ✅ Must be an image file
  // ✅ Must be under 5MB
  allow write: if request.auth != null 
               && request.auth.uid == userId
               && isImage()
               && isSizeValid();
}
```

---

## 🧪 Testing Checklist

After deploying, test these scenarios:

### ✅ Create a Listing
1. Login to your app
2. Go to `/sell/create`
3. Upload 2-3 images
4. Fill in product details
5. Click "Publish"
6. **Expected**: Listing appears in marketplace

### ✅ View a Listing
1. Browse to a product page
2. **Expected**: All images load without errors
3. Check browser console for CORS errors
4. Images should load from `firebasestorage.googleapis.com`

### ✅ Edit a Listing
1. Edit your own listing
2. **Expected**: Can update successfully
3. Try editing someone else's listing
4. **Expected**: Permission denied

### ✅ Upload Images
1. Select multiple images
2. **Expected**: All upload successfully
3. **Expected**: URLs added to `imageUrls` array
4. Try uploading a 10MB file
5. **Expected**: Should be rejected (5MB limit)

---

## ❌ Common Issues & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| **CORS Error** | CORS not configured | Run: `gsutil cors set storage.cors.json gs://...` |
| **Permission Denied (Firestore)** | Rules not deployed | Run: `firebase deploy --only firestore:rules` |
| **Permission Denied (Storage)** | User uploading to wrong folder | Check path: `products/{auth.uid}/{productId}/` |
| **Index Error** | Indexes not deployed | Run: `firebase deploy --only firestore:indexes` |
| **Images Not Loading** | Invalid URLs | Verify URLs start with `https://firebasestorage...` |
| **Upload Fails** | File too large | Check file size < 5MB |
| **Upload Fails** | Wrong file type | Only images allowed (.jpg, .png, .webp) |

---

## 📞 Quick Commands Reference

```bash
# Check current Firebase project
firebase projects:list

# Open Firebase Console
firebase console

# View Firestore data
firebase open firestore

# View Storage files  
firebase open storage

# Deploy all Firebase configs
./deploy-firebase.sh

# Deploy only Firestore
firebase deploy --only firestore

# Deploy only Storage
firebase deploy --only storage

# View logs
firebase functions:log
```

---

## 📊 Firebase Console URLs

**Your Firebase Project:**
- Console: https://console.firebase.google.com/project/studio-8322868971-8ca89
- Firestore: https://console.firebase.google.com/project/studio-8322868971-8ca89/firestore
- Storage: https://console.firebase.google.com/project/studio-8322868971-8ca89/storage
- Rules: https://console.firebase.google.com/project/studio-8322868971-8ca89/storage/rules

---

## ✅ Summary

**Your setup is already 95% correct!** 

What you have:
- ✅ Perfect database structure for listings
- ✅ Secure Firestore rules
- ✅ Comprehensive indexes for queries
- ✅ Organized Storage structure
- ✅ Validated image uploads
- ✅ Public image access

What to do:
1. Run `./deploy-firebase.sh` to deploy everything
2. Test creating a listing with images
3. Verify images load correctly
4. Done! 🎉

---

*For detailed information, see: `FIREBASE_SETUP_GUIDE.md`*
