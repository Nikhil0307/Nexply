// pages/api/extract-resume-keywords.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

interface RequestBody {
  resumeText: string;
}

interface ExtractedResumeData {
  jobTitleKeywords: string; // e.g., "Software Engineer, Full Stack Developer"
  skills: string;           // e.g., "Python, React, AWS, Docker"
  location?: string;        // e.g., "San Francisco, CA" or "Remote"
}

interface SuccessResponse extends ExtractedResumeData {}

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
    Analyze the following resume text. Your goal is to extract information to help pre-fill a job search form.
    Provide the output as a JSON object with the following keys: "jobTitleKeywords", "skills", and "location".

    1.  "jobTitleKeywords": Extract 1-3 potential job titles or primary role keywords from the resume.
        If multiple, separate them with a comma. If none are clear, leave this as an empty string.
        Examples: "Software Engineer, Full Stack Developer", "Product Manager", "Data Analyst"

    2.  "skills": Extract relevant technical skills, tools, and methodologies. Return as a comma-separated string.
        Examples: "Python, React, AWS, Docker, Agile, Scrum, Jira"

    3.  "location": Infer a primary location (city, state or country) if mentioned. If "remote" is strongly implied or stated, use "Remote".
        If no specific location is found, default to "India". Do not guess if not explicitly mentioned besides the default.

    Resume Text:
    ---
    ${resumeText}
    ---

    Return ONLY the JSON object. Do not include any other text, explanations, or markdown formatting.
    Example of a valid JSON output:
    {
      "jobTitleKeywords": "Senior Software Engineer, Backend Developer",
      "skills": "Java, Spring Boot, Python, Microservices, Kubernetes, SQL",
      "location": "Bengaluru, India"
    }
    Another example:
    {
      "jobTitleKeywords": "UX Designer",
      "skills": "Figma, Adobe XD, User Research, Prototyping",
      "location": "Remote"
    }
    Another example (if no job title or location is clear):
    {
      "jobTitleKeywords": "",
      "skills": "Microsoft Office, Communication, Teamwork",
      "location": "India"
    }
  `;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      { model: MODEL_NAME },
      // IMPORTANT: Specify JSON output mode if your model/SDK version supports it
      // For some Gemini models, you might need to instruct it in the prompt and parse the string.
      // Check the latest Gemini documentation for "JSON Mode" or "Function Calling" for reliable JSON.
      // For now, we'll rely on the prompt and parse.
    );
    const generationConfig = { temperature: 0.1, maxOutputTokens: 300 }; // Low temp for structured output
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
      console.error(`[API Keywords] No response. Blocked: ${blockReason}`);
      return res.status(500).json({ message: blockReason ? `Content generation blocked: ${blockReason}` : 'Failed to generate: No response from Gemini.' });
    }

    let rawJsonOutput = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawJsonOutput) {
      const finishReason = result.response.candidates?.[0]?.finishReason;
      console.error(`[API Keywords] No content. Finish reason: ${finishReason}`);
      return res.status(500).json({ message: finishReason ? `Content generation issue: ${finishReason}` : 'Failed: No content in Gemini response.' });
    }
    
    // Clean the output if Gemini includes markdown ```json ... ```
    if (rawJsonOutput.startsWith("```json")) {
      rawJsonOutput = rawJsonOutput.substring(7);
    }
    if (rawJsonOutput.endsWith("```")) {
      rawJsonOutput = rawJsonOutput.substring(0, rawJsonOutput.length - 3);
    }
    rawJsonOutput = rawJsonOutput.trim();

    let extractedData: ExtractedResumeData;
    try {
      extractedData = JSON.parse(rawJsonOutput) as ExtractedResumeData;
    } catch (parseError) {
      console.error("[API Keywords] Failed to parse JSON from Gemini:", parseError, "Raw output:", rawJsonOutput);
      return res.status(500).json({ message: 'Failed to parse keyword data from AI response.' });
    }
    
    console.log("[API Keywords] Extracted data:", extractedData);
    res.status(200).json({
        jobTitleKeywords: extractedData.jobTitleKeywords || "",
        skills: extractedData.skills || "",
        location: extractedData.location || "India", // Default to India if not found
    });

  } catch (error: unknown) {
    console.error('[API Keywords] Error extracting with Gemini:', error);
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    res.status(500).json({ message: 'Failed to extract keywords from resume.', error: message });
  }
}
