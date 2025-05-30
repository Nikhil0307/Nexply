// pages/api/parse-resume.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs'; // Node.js 'fs' module
import pdfParse from 'pdf-parse'; // Runs on server
import mammoth from 'mammoth'; // Runs on server

export const config = {
  api: {
    bodyParser: false, // Required for formidable to parse multipart/form-data
  },
};

interface SuccessResponse {
  text: string;
  fileName: string;
}

interface ErrorResponse {
  message: string;
  error?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']); // This is fine within an API handler
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const uploadedFileArray = files.resumeFile; // 'resumeFile' is the key from FormData

    if (!uploadedFileArray || uploadedFileArray.length === 0) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const uploadedFile = uploadedFileArray[0];

    if (!uploadedFile.filepath || !uploadedFile.originalFilename || !uploadedFile.mimetype) {
      return res.status(400).json({ message: 'Invalid file data received.' });
    }

    let extractedText = '';
    const filePath = uploadedFile.filepath; // formidable saves the file temporarily

    console.log(`[API /parse-resume] Processing file: ${uploadedFile.originalFilename}, type: ${uploadedFile.mimetype}`);

    if (uploadedFile.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      extractedText = data.text;
    } else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // .docx
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;
    } else if (uploadedFile.mimetype === 'text/plain' || uploadedFile.originalFilename.endsWith('.txt')) { // .txt
      extractedText = fs.readFileSync(filePath, 'utf8');
    } else {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.warn("[API /parse-resume] Could not delete temp unsupported file:", filePath, e); }
      return res.status(400).json({ message: `Unsupported file type: ${uploadedFile.mimetype}. Please upload PDF, DOCX, or TXT.` });
    }

    // Clean up the temporary file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (unlinkError) {
      console.warn("[API /parse-resume] Could not delete temp file:", filePath, unlinkError);
    }
    
    console.log(`[API /parse-resume] Successfully parsed: ${uploadedFile.originalFilename}`);
    res.status(200).json({ text: extractedText, fileName: uploadedFile.originalFilename });

  } catch (error: unknown) {
    console.error('[API /parse-resume] Error parsing resume on server:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse resume file on server.';
    res.status(500).json({ message });
  }
}
