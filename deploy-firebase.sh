#!/bin/bash
# Firebase Deployment Script for Listings & Images Setup
# Run this to deploy all Firebase configurations

echo "🔥 Firebase Deployment Script"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json not found. Please run this from the project root."
    exit 1
fi

echo "📋 Current Firebase Project:"
firebase projects:list | grep "(current)"
echo ""

# Deploy Firestore Rules
echo "📝 Deploying Firestore Security Rules..."
firebase deploy --only firestore:rules
if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi
echo ""

# Deploy Firestore Indexes
echo "📊 Deploying Firestore Indexes..."
firebase deploy --only firestore:indexes
if [ $? -eq 0 ]; then
    echo "✅ Firestore indexes deployed successfully"
else
    echo "❌ Failed to deploy Firestore indexes"
    exit 1
fi
echo ""

# Deploy Storage Rules
echo "🗄️  Deploying Storage Security Rules..."
firebase deploy --only storage
if [ $? -eq 0 ]; then
    echo "✅ Storage rules deployed successfully"
else
    echo "❌ Failed to deploy Storage rules"
    exit 1
fi
echo ""

# Apply Storage CORS
echo "🌐 Applying Storage CORS Configuration..."
if command -v gsutil &> /dev/null; then
    gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.firebasestorage.app
    if [ $? -eq 0 ]; then
        echo "✅ CORS configuration applied successfully"
    else
        echo "⚠️  Failed to apply CORS configuration"
        echo "   You may need to run: gcloud auth login"
    fi
else
    echo "⚠️  gsutil not found. Skipping CORS configuration."
    echo "   Install Google Cloud SDK to enable CORS deployment."
    echo "   Visit: https://cloud.google.com/sdk/docs/install"
fi
echo ""

echo "=============================="
echo "✅ Firebase deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Test product creation in your app"
echo "2. Test image upload to Storage"
echo "3. Verify images load correctly"
echo "4. Check Firebase Console for any errors"
echo ""
echo "📊 Useful Commands:"
echo "  firebase console              - Open Firebase Console"
echo "  firebase open firestore       - View Firestore data"
echo "  firebase open storage         - View Storage files"
echo ""
