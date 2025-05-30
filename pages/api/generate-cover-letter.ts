// pages/api/generate-cover-letter.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

interface RequestBody {
  jobDetails: {
    title: string;
    company: string;
    description: string;
  };
  resumeText: string;
}

interface SuccessResponse {
  coverLetter: string;
}

interface ErrorResponse {
  message: string;
  error?: unknown;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  if (!GEMINI_API_KEY) {
    console.error('[API /generate-cover-letter] Gemini API key not configured.');
    return res.status(500).json({ message: 'Server configuration error: Gemini API key missing.' });
  }

  const { jobDetails, resumeText } = req.body as RequestBody;

  if (!jobDetails || !jobDetails.title || !jobDetails.company || !jobDetails.description || !resumeText) {
    return res.status(400).json({ message: 'Missing required fields: jobDetails (title, company, description) and resumeText.' });
  }

  const prompt = `
    You are a professional career advisor. Write a compelling and concise cover letter for the following job application.
    The cover letter should be tailored to the specific job description and highlight relevant skills and experiences from the applicant's resume.
    The tone should be professional and enthusiastic. Address it to "Hiring Manager" if no specific contact is available.
    Focus on 2-3 key alignments between the resume and the job description.
    Keep the cover letter to 3-4 paragraphs.
    Do not include any placeholder like "[Your Name]" or "[Your Contact Information]".
    Start directly with the salutation (e.g., "Dear Hiring Manager,"). End directly before any closing like "Sincerely,".

    Applicant's Resume:
    --- APPLICANT RESUME ---
    ${resumeText}
    --- END APPLICANT RESUME ---

    Job Description:
    --- JOB DESCRIPTION ---
    Job Title: ${jobDetails.title}
    Company: ${jobDetails.company}
    Description: ${jobDetails.description}
    --- END JOB DESCRIPTION ---

    Generate only the cover letter text.
  `;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 1024,
    };
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{text: prompt}] }],
      generationConfig,
      safetySettings,
    });
    
    if (!result.response) {
      const blockReason = result.response?.promptFeedback?.blockReason;
      console.error(`[API /generate-cover-letter] No response. Blocked: ${blockReason}`);
      return res.status(500).json({ message: blockReason ? `Content generation blocked: ${blockReason}` : 'Failed to generate: No response from Gemini.' });
    }

    const coverLetter = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!coverLetter) {
      const finishReason = result.response.candidates?.[0]?.finishReason;
      console.error(`[API /generate-cover-letter] No content. Finish reason: ${finishReason}`);
      return res.status(500).json({ message: finishReason ? `Content generation issue: ${finishReason}` : 'Failed: No content in Gemini response.' });
    }

    console.log("[API /generate-cover-letter] Successfully generated cover letter.");
    res.status(200).json({ coverLetter });

  } catch (error: unknown) {
    console.error('[API /generate-cover-letter] Error generating with Gemini:', error);
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    res.status(500).json({ message: 'Failed to generate cover letter with Gemini.', error: message });
  }
}
