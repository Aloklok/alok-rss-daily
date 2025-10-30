# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Briefing Hub** is a personal RSS briefing center that displays daily generated article summaries. It's a React + TypeScript application deployed on Vercel, integrating with both Supabase (for article storage) and FreshRSS (for RSS feed management).

**Key Architecture Pattern**: The app uses a dual-backend architecture:
- **Supabase**: Stores processed articles with AI-generated metadata (summaries, scores, importance ratings)
- **FreshRSS**: Manages RSS feeds, article states (starred/read), and tags via Google Reader API

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Required environment variables (set in Vercel or `.env.local`):

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `FRESHRSS_API_URL` - FreshRSS instance URL
- `FRESHRSS_AUTH_TOKEN` - FreshRSS Google Reader API authentication token
- `GEMINI_API_KEY` - Google Gemini API key (if using AI features)

## Architecture

### Frontend Structure

- **App.tsx**: Main application component managing global state, routing between views (briefings/categories/starred), and coordinating data fetching
- **components/**: UI components organized by feature
  - `Briefing.tsx`: Main briefing view with article cards grouped by importance (重要新闻/必知要闻/常规更新)
  - `Sidebar.tsx`: Navigation sidebar with date picker, category/tag filters, and starred articles
  - `ReaderView.tsx`: Article reader with clean content display
  - `ArticleDetail.tsx`: Individual article detail modal
  - `ArticleList.tsx`: List view for filtered articles (categories/tags)
  - `SettingsPopover.tsx`: User settings and preferences
- **services/api.ts**: Centralized API client wrapping all backend calls
- **types.ts**: TypeScript interfaces for Article, BriefingReport, Filter, etc.

### Backend Structure (Vercel Serverless Functions)

All API routes are in `api/` directory:

- **get-briefings.ts**: Fetches articles from Supabase filtered by date and time slot (morning/afternoon/evening), groups by importance level
- **get-available-dates.ts**: Returns unique dates with articles, timezone-aware for Asia/Shanghai
- **articles.ts**: Fetches full article content from FreshRSS via Google Reader API
- **update-state.ts**: Unified API for updating article states (star/read) and custom tags in FreshRSS, supports batch operations, requires short-lived token
- **articles-categories-tags.ts**: Fetches articles by category/tag from FreshRSS streams
- **starred.ts**: Retrieves starred articles from FreshRSS
- **list-categories-tags.ts**: Lists available categories and tags
- **article-states.ts**: Fetches article states (read/starred/tags)

### Key Data Flows

1. **Article Display Flow**:
   - User selects date → `get-briefings` queries Supabase → groups by importance → displays in Briefing component
   - Click article → `articles` fetches full content from FreshRSS → displays in ReaderView

2. **State Management Flow**:
   - All state changes (star/read/tags) → `update-state` gets short-lived token from FreshRSS → calls edit-tag API with batch operations
   - Supports multiple tag additions/removals in a single API call using repeated `a`/`r` parameters

3. **Filter Flow**:
   - Date filter: fetches from Supabase (pre-processed articles with AI metadata)
   - Category/tag filter: fetches from FreshRSS (raw RSS items, minimal processing)
   - Starred filter: fetches from FreshRSS starred stream

### Time Zone Handling

All date operations use **Asia/Shanghai** timezone:
- Available dates formatting: `Intl.DateTimeFormat` with `timeZone: 'Asia/Shanghai'`
- Time slots (morning/afternoon/evening) based on Shanghai hour
- Article query ranges use `+08:00` timezone offset

### FreshRSS Google Reader API Integration

The app uses FreshRSS's Google Reader API compatibility:
- Authentication: `GoogleLogin auth={AUTH_TOKEN}` header
- Token refresh: Each state-changing operation requires fetching a short-lived token from `/token` endpoint
- Stream IDs: Use format `user/-/label/{name}` for categories/tags, `user/-/state/com.google/starred` for starred
- Tag format: `user/-/label/{tagName}` for custom tags, `user/-/state/com.google/{action}` for states

## Common Patterns

### Article Grouping by Importance

Articles in Supabase have a `verdict.importance` field with values:
- `重要新闻` (Important News)
- `必知要闻` (Must-Know News)  
- `常规更新` (Regular Updates)

The `get-briefings` API groups articles into these categories and sorts by `verdict.score` within each group.

### Tag Management

Tags come in two forms:
1. **State tags**: `user/-/state/com.google/{starred|read}` - system states for starred/read articles
2. **Label tags**: `user/-/label/{tagName}` - custom user-defined tags

Both types are managed via the unified `update-state` API which supports:
- Single or batch state changes (star/read)
- Single or batch label additions/removals
- All operations in one API call by repeating `a`/`r` parameters

When displaying tags, filter out state tags to only show label tags.

### Article ID Format

Article IDs from FreshRSS are typically in format: `tag:google.com,2005:reader/item/{hex_id}`
Always convert to string when passing to APIs.

## Deployment

The app is deployed on Vercel with automatic deployments from git. API functions are serverless (Node.js runtime).

Vercel configuration is in `.vercel/` directory (gitignored). Configure environment variables in Vercel dashboard.

## TypeScript Configuration

- Target: ESNext with React JSX transform
- Strict mode enabled
- Module resolution: Node
- No emit (Vite handles bundling)

## Styling

- **Tailwind CSS** for all styling
- Custom color schemes defined in `tailwind.config.js`
- Callout themes with distinct colors: fuchsia (summary), teal (insights), amber (warnings), sky (market)
- Responsive design with mobile-first approach
