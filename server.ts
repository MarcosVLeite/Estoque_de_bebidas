import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client utility
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Fallback high-res beverage imagery database for immediate selection
const CATEGORY_DEFAULT_IMAGES: Record<string, string[]> = {
  cerveja: [
    'https://images.unsplash.com/photo-1608270191295-8a03ca1714fc?auto=format&fit=crop&w=800&q=80', // cold beer glass & bottle
    'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80', // beer can
    'https://images.unsplash.com/photo-1518542698889-ca82282f08d5?auto=format&fit=crop&w=800&q=80', // beer glasses
    'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=800&q=80'  // bottles lined up
  ],
  refrigerante: [
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', // soda can
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80', // cold soda bottle
    'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80', // soda fizz
    'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80'  // cola can
  ],
  agua: [
    'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80', // mineral water bottle
    'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=800&q=80', // water bottle
    'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80'  // fresh water
  ],
  suco: [
    'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80', // orange juice
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80', // fruit juice
    'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=800&q=80'  // fresh natural juice
  ],
  destilado: [
    'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=800&q=80', // whisky bottle
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80', // cocktail / spirits
    'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=800&q=80'  // gin/vodka bottle
  ],
  vinho: [
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80', // red wine bottle & glass
    'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80', // wine bottles cellar
    'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80'  // white / rose wine
  ],
  energetico: [
    'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=800&q=80', // energy drink can
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80', // cold refreshing can
    'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=800&q=80'  // drink can
  ],
  outros: [
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80', // beverage bottles
    'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80'  // glassware and drinks
  ]
};

// Known popular products direct high-res images for instant auto-complete
const POPULAR_BEVERAGE_IMAGES: Record<string, string[]> = {
  heineken: [
    'https://images.unsplash.com/photo-1618886614638-80e3c153d31a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=800&q=80'
  ],
  coca: [
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=800&q=80'
  ],
  pepsi: [
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80'
  ],
  redbull: [
    'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=800&q=80'
  ],
  monster: [
    'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=800&q=80'
  ],
  whisky: [
    'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=800&q=80'
  ],
  cerveja: [
    'https://images.unsplash.com/photo-1608270191295-8a03ca1714fc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80'
  ],
  agua: [
    'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80'
  ]
};

// API Endpoint to search product images
app.post('/api/search-images', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, category, brand } = req.body || {};
    const searchTerm = `${brand ? brand + ' ' : ''}${query || ''}`.trim();

    if (!searchTerm) {
      res.json({ images: [], message: 'No search term provided' });
      return;
    }

    const ai = getGeminiClient();
    const candidateUrls: string[] = [];

    // Check popular keyword matches first
    const lowerQuery = searchTerm.toLowerCase();
    for (const [key, urls] of Object.entries(POPULAR_BEVERAGE_IMAGES)) {
      if (lowerQuery.includes(key)) {
        urls.forEach(u => {
          if (!candidateUrls.includes(u)) candidateUrls.push(u);
        });
      }
    }

    // Try Google Search grounding via Gemini to discover real web images if configured
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Find 3 to 4 direct public image URLs or official beverage packaging photo links for: "${searchTerm}". Focus on high-quality product packaging (bottle or can on clean background).
Format your answer strictly as a list of image URLs, one per line. If you find web sources, extract image or product asset URLs.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const text = response.text || '';
        // Extract any URLs ending in jpg, jpeg, png, webp, or unsplash/wikimedia/image host
        const urlRegex = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|svg)(?:\?[^\s"'<>]*)?|https?:\/\/images\.unsplash\.com\/[^\s"'<>]+)/gi;
        const foundUrls = text.match(urlRegex) || [];
        foundUrls.forEach((u) => {
          if (!candidateUrls.includes(u) && candidateUrls.length < 6) {
            candidateUrls.push(u);
          }
        });

        // Also inspect grounding chunks if any web URIs were returned
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk.web?.uri && /\.(jpg|png|webp|jpeg)/i.test(chunk.web.uri)) {
              if (!candidateUrls.includes(chunk.web.uri)) {
                candidateUrls.push(chunk.web.uri);
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini search grounding note:', geminiErr);
      }
    }

    // Supplement with curated high-quality category images so user always has 3-5 great choices
    const normalizedCategory = (category || 'outros').toLowerCase();
    const categoryDefaults = CATEGORY_DEFAULT_IMAGES[normalizedCategory] || CATEGORY_DEFAULT_IMAGES.outros;
    categoryDefaults.forEach(u => {
      if (!candidateUrls.includes(u) && candidateUrls.length < 6) {
        candidateUrls.push(u);
      }
    });

    res.json({
      images: candidateUrls.slice(0, 6),
      searchTerm,
      source: ai ? 'gemini_grounded' : 'curated_library'
    });
  } catch (error: any) {
    console.error('Image search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search images' });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Estoque de Bebidas server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
