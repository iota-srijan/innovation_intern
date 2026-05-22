# StockPilot

StockPilot is a modern inventory management dashboard built as a portfolio project. It provides a centralized interface for tracking stock levels, managing inventory items, and monitoring recent warehouse activities. The application connects to a Supabase PostgreSQL database and utilizes React Query for data fetching, caching, and optimistic UI updates.

**Live Demo:** [View Demo on Vercel](#) *(Placeholder)*

## Architecture & Goals

This project was built to demonstrate proficiency in modern frontend architecture:
- **Modular Component Design:** Extracting highly reusable layout and state components.
- **Client-State Management:** Implementing robust asynchronous state handling with React Query, avoiding unnecessary global state contexts.
- **Type Safety:** Enforcing strict TypeScript boundaries from database interactions to component props.
- **Accessibility & UX:** Providing standard keyboard navigation, ARIA attributes, and smooth skeleton-based loading states to prevent layout shifts.

## Previews

### Dashboard Overview
![Dashboard Preview](public/preview/dashboard.png)
*Displays aggregated inventory health, low stock visualizations, and an active timeline of recent modifications.*

### Inventory Management
![Inventory Preview](public/preview/inventory.png)
*A dense, performant data table supporting client-side filtering, sorting, and full CRUD operations.*

## Features

- **Dashboard Metrics:** Overview of total items, low stock alerts, and inventory distribution via bar charts.
- **Inventory Management:** Full CRUD (Create, Read, Update, Delete) functionality for inventory items.
- **Client-Side Filtering & Sorting:** Search by item name or SKU and filter by category.
- **Form Validation:** Client-side validation for item creation and updates using Zod.
- **Optimistic UI:** Immediate UI feedback for data mutations before server confirmation.
- **Offline Mock Fallback:** Automatically switches to an in-memory mock dataset if database credentials are not provided.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Lucide React
- **Data Fetching:** React Query (v5)
- **Forms & Validation:** React Hook Form, Zod
- **Backend & Database:** Supabase (PostgreSQL)
- **Charts:** Recharts

## Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stockpilot.git
   cd stockpilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *Note: If these variables are empty, the application will automatically fall back to using local mock data. This allows for immediate UI testing without database configuration.*

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Deployment

This project is natively configured for zero-config deployment on Vercel. 

1. Connect your GitHub repository to Vercel.
2. Select **Vite** as the Framework Preset.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Environment Variables settings.
4. Deploy.

*Note: The included `vercel.json` file ensures that routing works correctly for Single Page Applications (SPAs).*

## Project Structure

```text
src/
├── components/
│   ├── common/          # Reusable structural primitives (PageHeader, Skeleton, SectionCard)
│   ├── dashboard/       # Dashboard specific widgets (charts, stats, recent activity)
│   ├── inventory/       # Inventory table, modals, and badges
│   └── layout/          # Global layout components (Sidebar, TopBar)
├── hooks/               # React Query data fetching hooks
├── lib/                 # Utility functions, Supabase client, and mock data provider
├── pages/               # Main route entries
└── types/               # TypeScript interfaces and global schemas
```
