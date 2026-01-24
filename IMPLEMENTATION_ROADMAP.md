# Picksy Feature Implementation Roadmap

## Phase 1: Foundation & Admin Tools (Week 1) ✅ STARTED
### 1.1 Super Admin Dashboard
- [ ] Centralized admin panel at `/admin/power-tools`
- [ ] Link to all bulk upload tools
- [ ] Quick stats overview
- [ ] Bulk editing interface

### 1.2 Advanced Filtering & Search
- [ ] Filter component with price range slider
- [ ] Multi-select categories
- [ ] Year range filter
- [ ] Condition checkboxes
- [ ] Seller rating filter
- [ ] Location filter
- [ ] Sort dropdown (newest, price, popularity, ending soon)
- [ ] URL state management for shareable filters

### 1.3 Make an Offer System
- [ ] Database schema for offers collection
- [ ] "Make Offer" button on product pages
- [ ] Offer modal with expiry timer
- [ ] Seller offer management interface
- [ ] Accept/Counter/Decline actions
- [ ] Notification system for offer activity
- [ ] 24-hour auto-expiry logic

## Phase 2: Seller Power Tools (Week 2)
### 2.1 Bulk Editing
- [ ] Multi-select products in dashboard
- [ ] Bulk price update
- [ ] Bulk condition update
- [ ] Bulk status change (draft, available, sold)
- [ ] Bulk delete

### 2.2 Automated Repricing
- [ ] Price monitoring service
- [ ] "Match lowest in category" toggle
- [ ] Price floor/ceiling settings
- [ ] Repricing history log

### 2.3 Inventory Alerts
- [ ] Low stock threshold settings
- [ ] Email/dashboard notifications
- [ ] Out of stock auto-status change

### 2.4 Sales Analytics
- [ ] Dashboard with charts (Chart.js/Recharts)
- [ ] Best selling times heatmap
- [ ] Category performance
- [ ] Revenue graphs
- [ ] Export to CSV

### 2.5 QR Code Management
- [ ] Generate QR codes for products
- [ ] QR scanner interface
- [ ] Batch QR generation
- [ ] Print-ready QR labels

### 2.6 Shipping Integration
- [ ] Shippo API integration
- [ ] Rate calculator
- [ ] Label generation
- [ ] Tracking number capture
- [ ] Webhook for delivery status

## Phase 3: Discovery & Engagement (Week 3)
### 3.1 Price Alerts & Saved Searches
- [ ] Search save button
- [ ] User saved searches dashboard
- [ ] Background job for new listing checks
- [ ] Email notification system
- [ ] Price drop detection on favorites
- [ ] Alert management page

### 3.2 Enhanced Discovery
- [ ] Recently Viewed section (use existing context)
- [ ] AI-powered similar items (Genkit flow)
- [ ] "People also viewed" tracking
- [ ] Recommendation engine based on view/fav history
- [ ] Homepage personalized recommendations

### 3.3 Social Trust Features
- [ ] Verification system (email, phone)
- [ ] Response time calculation
- [ ] Last active tracking
- [ ] Completed sales counter
- [ ] Return policy field on listings
- [ ] Seller trust score algorithm

## Phase 4: Platform Features (Week 4)
### 4.1 Follow System (if time permits)
- [ ] Follow/unfollow sellers
- [ ] Activity feed
- [ ] Follower notifications
- [ ] Seller announcements

### 4.2 Video Support (if time permits)
- [ ] Video upload to Firebase Storage
- [ ] Video player component
- [ ] Video thumbnail generation
- [ ] 30-second limit enforcement

---

## Immediate Next Steps:
1. Create Super Admin Power Tools Dashboard
2. Implement Advanced Filtering (high user demand)
3. Build Make an Offer System (high conversion impact)
4. Add Bulk Editing for sellers
