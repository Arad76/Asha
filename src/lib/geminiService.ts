
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  timestamp: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  bullets: string[];
}

export interface MarketSentiment {
  score: number; // -1 to 1
  consensus: string;
  intensity: 'High' | 'Medium' | 'Low';
  newsItems: NewsItem[];
}

export async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      if (attempt < retries && isRateLimit) {
        console.warn(`Gemini rate limit hit. Retrying in ${delay * Math.pow(2, attempt)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        attempt++;
        continue;
      }
      throw error; // throw on final attempt or non-rate-limit error
    }
  }
  throw new Error("Max retries reached");
}

let newsCache: { data: NewsItem[], timestamp: number } | null = null;
let sentimentCache: { data: MarketSentiment, timestamp: number } | null = null;
const CACHE_TTL = 300000; // 5 minutes

const getMockNews = (): NewsItem[] => [
  {
    title: "Oil Prices Stabilize After Initial Surges",
    source: "Reuters",
    url: "#",
    timestamp: new Date().toISOString(),
    sentiment: "Neutral",
    bullets: [
      "Market digests recent OPEC+ output cuts.",
      "Inventory levels show a slight build, contrary to expectations."
    ]
  },
  {
    title: "Geopolitical Tensions Keep Floor Under Oil Market",
    source: "Bloomberg",
    url: "#",
    timestamp: new Date().toISOString(),
    sentiment: "Bullish",
    bullets: [
      "Ongoing Middle East tensions elevate risk premium.",
      "Supply disruptions remain a key concern for traders."
    ]
  },
  {
    title: "IEA Projects Slower Demand Growth Next Year",
    source: "IEA",
    url: "#",
    timestamp: new Date().toISOString(),
    sentiment: "Bearish",
    bullets: [
      "Macroeconomic headwinds may slow long-term demand.",
      "Transition to renewables accelerates in key markets."
    ]
  }
];

export async function fetchOilNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (newsCache && now - newsCache.timestamp < CACHE_TTL) {
    return newsCache.data;
  }

  try {
    const newsData = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Search for the latest CRITICAL WTI Crude Oil news. PRIORITY SOURCES: Telegram, Twitter, YouTube (FinTwit, major trading channels), Reuters, Bloomberg, OPEC+ statements, IEA. Focus on fast-breaking geopolitical tensions (Middle East, Russia), inventory reports (EIA), and OPEC production cuts. Look for 'breaking news' on social media platforms about oil. Analyze the sentiment for WTI oil for each item. For each item, provide 2-3 concise bullet points summarizing the key market impact.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                url: { type: Type.STRING },
                timestamp: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
                bullets: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "2-3 bullet points summarizing the news"
                }
              },
              required: ['title', 'source', 'url', 'sentiment', 'bullets']
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    });

    newsCache = { data: newsData, timestamp: Date.now() };
    return newsData;
  } catch (error) {
    console.error("Error fetching oil news, using mock fallback. Error:", error);
    const mockNews = getMockNews();
    newsCache = { data: mockNews, timestamp: Date.now() };
    return mockNews;
  }
}

export async function analyzeOverallSentiment(): Promise<MarketSentiment> {
  const now = Date.now();
  if (sentimentCache && now - sentimentCache.timestamp < CACHE_TTL) {
    return sentimentCache.data;
  }

  const news = await fetchOilNews();
  
  try {
    const result = await fetchWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on these recent headlines for WTI Crude Oil, provide an overall market sentiment analysis: ${JSON.stringify(news.map(n => n.title))}. Return a JSON object with: score (-1 bearish to 1 bullish), consensus (short summary), intensity (High, Medium, Low).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              consensus: { type: Type.STRING },
              intensity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
            },
            required: ['score', 'consensus', 'intensity']
          }
        }
      });

      const summary = JSON.parse(response.text || '{}');
      return {
        ...summary,
        newsItems: news
      };
    });

    sentimentCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error("Error analyzing macro sentiment, using fallback. Error:", error);
    const fallbackResult = { score: 0.2, consensus: "Cautiously Optimistic (Fallback)", intensity: "Medium" as const, newsItems: news };
    sentimentCache = { data: fallbackResult, timestamp: Date.now() };
    return fallbackResult;
  }
}
