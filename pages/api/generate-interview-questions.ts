// pages/api/generate-interview-questions.ts
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
  questions: string;
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
    console.error('[API /generate-interview-questions] Gemini API key not configured.');
    return res.status(500).json({ message: 'Server configuration error: Gemini API key missing.' });
  }

  const { jobDetails, resumeText } = req.body as RequestBody;

  if (!jobDetails || !jobDetails.title || !jobDetails.company || !jobDetails.description || !resumeText) {
    return res.status(400).json({ message: 'Missing required fields: jobDetails and resumeText.' });
  }

  const prompt = `
    You are an interview preparation assistant. Based on the provided job description and applicant's resume, generate a list of 5-7 potential interview questions.
    These questions should help the applicant prepare for an interview for this specific role.
    Include a mix of:
    1. Behavioral questions ("Tell me about a time...").
    2. Situational questions ("How would you handle X...?").
    3. Technical questions relevant to skills in the job description and resume.
    4. Questions about specific projects or experiences from the resume that align with the job.

    Applicant's Resume:
    ---
    ${resumeText}
    ---

    Job Description:
    ---
    Job Title: ${jobDetails.title}
    Company: ${jobDetails.company}
    Description: ${jobDetails.description}
    ---

    Format the output as a numbered list. Each question should be on a new line.
    Example:
    1. Can you describe a challenging project from your resume and how it relates to our needs for this role?
  `;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const generationConfig = { temperature: 0.6, maxOutputTokens: 800 };
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
      console.error(`[API /generate-interview-questions] No response. Blocked: ${blockReason}`);
      return res.status(500).json({ message: blockReason ? `Content generation blocked: ${blockReason}` : 'Failed to generate: No response from Gemini.' });
    }

    const questions = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!questions) {
      const finishReason = result.response.candidates?.[0]?.finishReason;
      console.error(`[API /generate-interview-questions] No content. Finish reason: ${finishReason}`);
      return res.status(500).json({ message: finishReason ? `Content generation issue: ${finishReason}` : 'Failed: No content in Gemini response.' });
    }
    
    console.log("[API /generate-interview-questions] Successfully generated questions.");
    res.status(200).json({ questions });

  } catch (error: unknown) {
    console.error('[API /generate-interview-questions] Error generating with Gemini:', error);
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    res.status(500).json({ message: 'Failed to generate interview questions.', error: message });
  }
}
