// pages/api/extract-resume-keywords.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

interface RequestBody {
  resumeText: string;
}

interface SuccessResponse {
  keywords: string;
}

interface ErrorResponse {
  message: string;
  error?: unknown;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest"; // Or your preferred Gemini model

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  if (!GEMINI_API_KEY) {
    console.error('[API /extract-resume-keywords] Gemini API key not configured.');
    return res.status(500).json({ message: 'Server configuration error: Gemini API key missing.' });
  }

  const { resumeText } = req.body as RequestBody;

  if (!resumeText) {
    return res.status(400).json({ message: 'Missing required field: resumeText.' });
  }

  const prompt = `
    Analyze the following resume text and extract the top 5-10 most relevant job-related keywords and technical skills.
    Focus on nouns and noun phrases that represent technologies, programming languages, tools, methodologies, and specific professional skills.
    Return the keywords and skills as a single comma-separated string. Do not include any introductory text or explanation, just the comma-separated list.

    Example output: Python, JavaScript, React, Node.js, Agile, Project Management, SQL, AWS, Docker

    Resume Text:
    ---
    ${resumeText}
    ---
    Keywords/Skills:
  `;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const generationConfig = { temperature: 0.2, maxOutputTokens: 200 };
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{text: prompt}] }],
      generationConfig,
      safetySettings,
    });
    
    if (!result.response) {
      const blockReason = result.response?.promptFeedback?.blockReason;
      console.error(`[API /extract-resume-keywords] No response. Blocked: ${blockReason}`);
      return res.status(500).json({ message: blockReason ? `Content generation blocked: ${blockReason}` : 'Failed to generate: No response from Gemini.' });
    }

    const extractedKeywords = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!extractedKeywords) {
      const finishReason = result.response.candidates?.[0]?.finishReason;
      console.error(`[API /extract-resume-keywords] No content. Finish reason: ${finishReason}`);
      return res.status(500).json({ message: finishReason ? `Content generation issue: ${finishReason}` : 'Failed: No content in Gemini response.' });
    }
    
    console.log("[API /extract-resume-keywords] Extracted keywords:", extractedKeywords);
    res.status(200).json({ keywords: extractedKeywords });

  } catch (error: unknown) {
    console.error('[API /extract-resume-keywords] Error extracting with Gemini:', error);
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    res.status(500).json({ message: 'Failed to extract keywords from resume.', error: message });
  }
}
