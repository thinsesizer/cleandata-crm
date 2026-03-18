# CleanData CRM - Dashboard Overview

## 🎯 Dashboard Features

Your dashboard is the command center for managing CRM data quality. Here's what users see:

### 📊 Stats Overview (Top Row)
- **Total Contacts** - Live count of all contacts in system
- **Enriched** - Contacts with ABN/website data
- **Duplicates Found** - Potential matches requiring review
- **Data Quality Score** - Overall health metric

### ⚡ Quick Actions Card
One-click access to:
1. **Run Enrichment** - Start ABN/website enrichment jobs
2. **Find Duplicates** - Trigger deduplication scan
3. **Connect Salesforce** - OAuth integration setup

### 📈 Enrichment Progress
Real-time progress bars showing:
- ABN Lookup completion rate
- Website scraping progress
- Deduplication status

### 🔔 Recent Activity Feed
Live event stream:
- Enrichment completions
- Duplicate detections
- Salesforce sync updates

---

## 📁 Dashboard Files

```
src/app/(dashboard)/
├── layout.tsx          # Sidebar + header layout
├── page.tsx            # Main dashboard (this file)
├── contacts/
│   └── page.tsx        # Contact management
├── enrichment/
│   └── page.tsx        # Enrichment job control
├── deduplication/
│   └── page.tsx        # Duplicate review UI
├── settings/
│   └── page.tsx        # Salesforce integration
└── operations/
    └── page.tsx        # Real-time metrics
```

---

## 🚀 Live Dashboard Demo

When you run `npm run dev`, visit:
http://localhost:3000/dashboard

### Default View Shows:
1. 4 stat cards with sample data
2. Quick action buttons
3. Progress bars for enrichment
4. Recent activity timeline

### Navigation:
- **Sidebar** - Switch between sections
- **Header** - User info + logout
- **Cards** - Click for detailed views

---

## 🎨 UI Components Used

- **Card** - Container components
- **Button** - Action triggers
- **Progress** - Completion indicators
- **Icons** - Lucide React icons
- **Grid** - Responsive layout

---

## 📱 Responsive Design

Dashboard adapts to:
- **Desktop** - 4-column stats, side-by-side cards
- **Tablet** - 2-column stats, stacked cards
- **Mobile** - 1-column layout, hamburger menu

---

## 🔐 Protected Route

Dashboard requires authentication:
- Redirects to `/login` if not authenticated
- Loads user data from Supabase
- Shows tenant-specific data only

---

## 🔄 Real-Time Updates (Next Phase)

To add WebSocket real-time updates:
1. Install `socket.io-client`
2. Connect to `/api/socket`
3. Listen for job progress events
4. Auto-refresh stats every 30 seconds

---

## 📊 Data Sources

Dashboard pulls from:
- **Database** - Contact counts, enrichment status
- **Redis** - Job queue depth, active jobs
- **Salesforce** - Sync status, last update

---

**Ready to customize?** Edit `src/app/(dashboard)/page.tsx`