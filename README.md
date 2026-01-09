# Today in Biology

A minimal daily blog that shows AI-generated summaries of the most exciting biology papers, automatically selected and written.

Live Repository: [github.com/tanzeel-a/crazy_bionews](https://github.com/tanzeel-a/crazy_bionews)

![Preview](https://via.placeholder.com/800x400/2d5a27/ffffff?text=Today+in+Biology)

## Features

- 🔬 Fetches recent biology papers from [bioRxiv](https://www.biorxiv.org/)
- 📊 Scores papers using transparent heuristics
- 🤖 Generates blog summaries using Groq AI (Llama 3.1)
- 📱 Clean, responsive, dark-mode-ready frontend
- ⏰ Runs automatically once per day via Supabase Cron

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Supabase (Postgres + Edge Functions + Cron)
- **AI**: Groq API (free tier)
- **Data**: bioRxiv public API

---

## Quick Start

### Prerequisites

1. **Supabase Account**: Create at [supabase.com](https://supabase.com) (free)
2. **Groq API Key**: Get from [console.groq.com](https://console.groq.com) (free)
3. **Supabase CLI**: Install via `npm install -g supabase`

---

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Enter project name: `today-in-biology`
4. Set a secure database password (save this!)
5. Select your region
6. Click "Create new project"
7. Wait for setup to complete

---

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run"
5. Verify tables were created in **Table Editor**

---

## Step 3: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase
supabase login

# Link to your project (get project-ref from project settings)
cd today-in-biology/supabase
supabase link --project-ref YOUR_PROJECT_REF

# Set the Groq API key secret
supabase secrets set GROQ_API_KEY=your_groq_api_key_here

# Deploy the function
supabase functions deploy generate-daily-story
```

### Option B: Using Dashboard

1. Go to **Edge Functions** in your dashboard
2. Click "Create a new function"
3. Name it `generate-daily-story`
4. Copy the code from `supabase/functions/generate-daily-story/index.ts`
5. Deploy the function
6. Go to **Project Settings > Edge Functions**
7. Add secret: `GROQ_API_KEY` = your Groq API key

---

## Step 4: Set Up Daily Cron Job

1. In Supabase dashboard, go to **Database > Extensions**
2. Enable the `pg_cron` extension if not already enabled
3. Go to **SQL Editor** and run:

```sql
-- Create a cron job to run daily at 6:00 AM UTC
SELECT cron.schedule(
    'daily-biology-story',           -- job name
    '0 6 * * *',                     -- cron expression (6 AM UTC daily)
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-daily-story',
        headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your project reference (from project settings)
- `YOUR_ANON_KEY` with your anon/public API key (from Settings > API)

To verify or manage cron jobs:

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Delete a cron job
SELECT cron.unschedule('daily-biology-story');
```

---

## Step 5: Configure Frontend

1. Open `app.js`
2. Update the `CONFIG` object with your Supabase credentials:

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_ANON_KEY'
};
```

Find these values in: **Project Settings > API**

---

## Step 6: Generate First Story

Before the frontend works, you need at least one story. Run the Edge Function manually:

### Option A: Using cURL

```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-daily-story' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

### Option B: Using Dashboard

1. Go to **Edge Functions**
2. Select `generate-daily-story`
3. Click "Invoke" to run it manually

---

## Step 7: Host Frontend

### Option A: Local Testing

```bash
# Using Python
cd today-in-biology
python3 -m http.server 8000

# Or using Node
npx serve .
```

Open [http://localhost:8000](http://localhost:8000)

### Option B: Static Hosting (Recommended)

Deploy to any static host:

- **Netlify**: Drag & drop the folder
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to a `gh-pages` branch
- **Cloudflare Pages**: Connect your repo

---

## Project Structure

```
today-in-biology/
├── index.html              # Main HTML page
├── style.css               # Styles (minimal, responsive)
├── app.js                  # Frontend logic
├── README.md               # This file
└── supabase/
    ├── schema.sql          # Database tables
    └── functions/
        └── generate-daily-story/
            └── index.ts    # Edge Function
```

---

## Database Schema

### `papers` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Paper title |
| abstract | TEXT | Paper abstract |
| source | TEXT | Source (e.g., "biorxiv") |
| doi | TEXT | Digital Object Identifier (unique) |
| authors | TEXT | Comma-separated authors |
| category | TEXT | Subject category |
| score | INTEGER | Excitement score |
| published_at | TIMESTAMP | Publication date |
| created_at | TIMESTAMP | Record creation date |

### `daily_story` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| content | TEXT | Generated blog post |
| paper_ids | UUID[] | References to source papers |
| created_at | TIMESTAMP | Generation date |

---

## Scoring Algorithm

Papers are scored transparently:

| Factor | Points |
|--------|--------|
| Published today | +10 |
| Published yesterday | +5 |
| Contains "CRISPR", "gene editing" | +5 |
| Contains "novel", "first", "breakthrough" | +3 |
| Abstract > 500 characters | +3 |
| High-impact category | +3 |

---

## AI Prompt

The Edge Function uses this prompt (summarized):

> Write a short blog post for curious biology students. Explain the core idea simply, why it matters, and one implication. No jargon, no hype. 300-400 words. Write in second person.

---

## Environment Variables

| Variable | Description | Where |
|----------|-------------|-------|
| `SUPABASE_URL` | Auto-set in Edge Functions | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set in Edge Functions | Supabase |
| `GROQ_API_KEY` | Your Groq API key | Set as secret |

---

## Troubleshooting

### "No stories available"
- Run the Edge Function manually first
- Check Edge Function logs for errors
- Verify `GROQ_API_KEY` secret is set

### "Unable to load"
- Check browser console for errors
- Verify Supabase URL and anon key in `app.js`
- Ensure RLS policies allow public select

### Edge Function fails
- Check logs in **Edge Functions > Logs**
- Verify Groq API key is valid
- bioRxiv API might be temporarily down

---

## Customization

### Change update time
Edit the cron expression in the SQL:
- `'0 6 * * *'` = 6:00 AM UTC daily
- `'0 12 * * *'` = 12:00 PM UTC daily
- `'0 */6 * * *'` = Every 6 hours

### Add more sources
Edit `generate-daily-story/index.ts`:
- Add RSS feed parsing for journals
- Integrate Europe PMC API
- Add arXiv q-bio category

### Adjust scoring
Modify the `scorePaper()` function to weight different factors.

---

## License

MIT License - feel free to modify and deploy.

---

## Credits

- Data: [bioRxiv](https://www.biorxiv.org/) - the preprint server for biology
- AI: [Groq](https://groq.com/) - fast inference for LLMs
- Backend: [Supabase](https://supabase.com/) - open source Firebase alternative
