// ============================================
// Today in Biology - Daily Story Generator
// Supabase Edge Function
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CONFIGURATION
// ============================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";
const BIORXIV_API_BASE = "https://api.biorxiv.org/details/biorxiv";

// Biology-related categories to fetch
const BIOLOGY_CATEGORIES = [
  "cell_biology",
  "genetics",
  "genomics",
  "molecular_biology",
  "neuroscience",
  "evolutionary_biology",
  "developmental_biology",
  "microbiology",
  "biochemistry",
  "bioinformatics",
  "systems_biology",
  "synthetic_biology",
];

// Keywords that signal exciting research
const EXCITING_KEYWORDS = [
  "CRISPR",
  "gene editing",
  "novel",
  "first",
  "breakthrough",
  "discover",
  "reveal",
  "mechanism",
  "therapy",
  "cure",
  "stem cell",
  "genome",
  "protein structure",
  "evolution",
];

// ============================================
// TYPES
// ============================================

interface Paper {
  doi: string;
  title: string;
  abstract: string;
  authors: string;
  category: string;
  date: string;
  score: number;
}

interface BioRxivResponse {
  collection: Array<{
    doi: string;
    title: string;
    abstract: string;
    authors: string;
    category: string;
    date: string;
  }>;
  messages: Array<{ status: string; count: number }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get date string in YYYY-MM-DD format
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Fetch papers from bioRxiv API for the last N days
 */
async function fetchBioRxivPapers(days: number = 2): Promise<Paper[]> {
  const papers: Paper[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  const startStr = formatDate(startDate);
  const endStr = formatDate(today);

  // Fetch papers for multiple biology categories
  for (const category of BIOLOGY_CATEGORIES.slice(0, 5)) {
    // Limit to 5 categories for speed
    try {
      const url = `${BIORXIV_API_BASE}/${startStr}/${endStr}/0/json?category=${category}`;
      console.log(`Fetching: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch category ${category}: ${response.status}`);
        continue;
      }

      const data: BioRxivResponse = await response.json();

      if (data.collection && Array.isArray(data.collection)) {
        for (const paper of data.collection) {
          papers.push({
            doi: paper.doi,
            title: paper.title,
            abstract: paper.abstract || "",
            authors: paper.authors || "",
            category: paper.category || category,
            date: paper.date,
            score: 0,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching category ${category}:`, error);
    }
  }

  // Deduplicate by DOI
  const uniquePapers = new Map<string, Paper>();
  for (const paper of papers) {
    if (!uniquePapers.has(paper.doi)) {
      uniquePapers.set(paper.doi, paper);
    }
  }

  return Array.from(uniquePapers.values());
}

/**
 * Score a paper based on heuristics
 */
function scorePaper(paper: Paper): number {
  let score = 0;
  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  // Recency bonus
  if (paper.date === today) {
    score += 10;
  } else if (paper.date === yesterday) {
    score += 5;
  }

  // Keyword matching in title and abstract
  const text = `${paper.title} ${paper.abstract}`.toLowerCase();
  for (const keyword of EXCITING_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 5;
    }
  }

  // Abstract quality (substantive abstracts)
  if (paper.abstract && paper.abstract.length > 500) {
    score += 3;
  }

  // High-impact categories bonus
  const highImpactCategories = ["cell_biology", "genetics", "neuroscience", "genomics"];
  if (highImpactCategories.includes(paper.category.toLowerCase().replace(" ", "_"))) {
    score += 3;
  }

  return score;
}

/**
 * Select top N papers based on score
 */
function selectTopPapers(papers: Paper[], count: number = 3): Paper[] {
  // Score all papers
  for (const paper of papers) {
    paper.score = scorePaper(paper);
  }

  // Sort by score descending
  papers.sort((a, b) => b.score - a.score);

  // Return top N
  return papers.slice(0, count);
}

/**
 * Generate blog post using Groq AI
 */
async function generateBlogPost(papers: Paper[], groqApiKey: string): Promise<string> {
  const paperSummaries = papers
    .map(
      (p, i) =>
        `Paper ${i + 1}: "${p.title}"
Authors: ${p.authors}
Category: ${p.category}
Abstract: ${p.abstract.slice(0, 1000)}...`
    )
    .join("\n\n");

  const prompt = `You are a science writer creating a daily blog post for curious biology students. 
Your task is to summarize the most exciting finding from today's biology research.

Here are the top papers:

${paperSummaries}

Write a short blog post (300-400 words) that:
1. Focuses on the single most interesting finding across these papers
2. Explains the core idea in simple terms (no jargon)
3. Explains why this matters for biology
4. Gives one concrete implication or future possibility
5. Is honest and accurate - no hype or exaggeration

Write in second person ("You might wonder...") and keep it engaging but grounded.
Do NOT include a title - just the body text.
Do NOT use bullet points - write in flowing paragraphs.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a friendly science writer who makes biology accessible and exciting without overselling findings.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  try {
    // CORS headers for browser requests
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    if (!groqApiKey) {
      throw new Error("Missing GROQ_API_KEY environment variable");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Step 1: Fetching papers from bioRxiv...");
    const allPapers = await fetchBioRxivPapers(2);
    console.log(`Fetched ${allPapers.length} papers`);

    if (allPapers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No papers found" }),
        { headers, status: 500 }
      );
    }

    console.log("Step 2: Scoring and selecting top papers...");
    const topPapers = selectTopPapers(allPapers, 3);
    console.log(`Selected ${topPapers.length} top papers:`);
    for (const p of topPapers) {
      console.log(`  - [${p.score}] ${p.title.slice(0, 60)}...`);
    }

    console.log("Step 3: Saving papers to database...");
    const savedPaperIds: string[] = [];
    for (const paper of topPapers) {
      // Upsert paper (update if DOI exists, insert otherwise)
      const { data, error } = await supabase
        .from("papers")
        .upsert(
          {
            title: paper.title,
            abstract: paper.abstract,
            source: "biorxiv",
            doi: paper.doi,
            authors: paper.authors,
            category: paper.category,
            score: paper.score,
            published_at: paper.date,
          },
          { onConflict: "doi" }
        )
        .select("id")
        .single();

      if (error) {
        console.error(`Error saving paper: ${error.message}`);
      } else if (data) {
        savedPaperIds.push(data.id);
      }
    }

    console.log("Step 4: Generating blog post with AI...");
    const blogContent = await generateBlogPost(topPapers, groqApiKey);
    console.log(`Generated blog post (${blogContent.length} chars)`);

    console.log("Step 5: Saving daily story...");
    const { data: storyData, error: storyError } = await supabase
      .from("daily_story")
      .insert({
        content: blogContent,
        paper_ids: savedPaperIds,
      })
      .select()
      .single();

    if (storyError) {
      throw new Error(`Error saving story: ${storyError.message}`);
    }

    console.log("Success! Daily story generated.");

    return new Response(
      JSON.stringify({
        success: true,
        story_id: storyData.id,
        papers_count: savedPaperIds.length,
      }),
      { headers }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
