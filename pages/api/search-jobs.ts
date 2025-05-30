// pages/api/search-jobs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosRequestConfig } from 'axios';

// Consistent Job Interface (ensure snippet is still optional)
export interface JobPoc {
  id: string;
  sourceApi: string;
  title: string;
  company: string; // For Upwork, this might be "Client" or "Freelance Opportunity"
  location: string;
  description: string;
  snippet?: string;
  url?: string;
  datePosted?: string;
  salary?: string; // e.g., budget, hourly rate
}

interface ErrorResponse { message: string; error?: any; }
interface SearchParams { keywords: string; location: string; skills?: string; page?: number; }

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// API Host Constants from .env.local
const JSEARCH_API_HOST = process.env.RAPIDAPI_JSEARCH_HOST;
// const UPWORKJOBS2_HOST = process.env.RAPIDAPI_UPWORKJOBS2_HOST; // Comment out or remove old one
const UPWORK_JOBS_P_HOST = process.env.RAPIDAPI_UPWORK_JOBS_P_HOST; // <<< NEW HOST
const LINKEDINPOST_HOST = process.env.RAPIDAPI_LINKEDINPOST_HOST;


// --- JSearch API Fetcher (Job Search Endpoint) ---
async function fetchFromJSearch(params: SearchParams): Promise<JobPoc[]> {
  if (!JSEARCH_API_HOST || !RAPIDAPI_KEY) {
    console.warn('JSearch API not configured. Skipping.');
    return [];
  }
  const query = `${params.keywords} ${params.skills || ''} in ${params.location}`.trim();
  const options: AxiosRequestConfig = {
    method: 'GET',
    url: `https://${JSEARCH_API_HOST}/search`,
    params: { query, page: String(params.page || '1'), num_pages: '1' },
    headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': JSEARCH_API_HOST },
  };
  try {
    const response = await axios.request(options);
    if (response.data && response.data.data) {
      return response.data.data.map((job: any): JobPoc => {
        const rawDescription = job.job_description || 'No description available.';
        let jobSnippet = job.job_highlights?.Snippets?.[0] || job.job_highlights?.description;
        if (!jobSnippet && rawDescription && rawDescription !== 'No description available.') {
          jobSnippet = rawDescription.substring(0, 150) + (rawDescription.length > 150 ? '...' : '');
        }
        return {
          id: `jsearch-${job.job_id || crypto.randomUUID()}`,
          sourceApi: 'JSearch',
          title: job.job_title || 'N/A',
          company: job.employer_name || 'N/A',
          location: job.job_city || job.job_state || job.job_country || 'N/A',
          description: rawDescription,
          snippet: jobSnippet,
          url: job.job_apply_link || job.employer_website,
          datePosted: job.job_posted_at_datetime_utc,
        };
      });
    } return [];
  } catch (e: any) { console.error('Error JSearch:', e.response?.data?.message || e.message); return []; }
}


// --- New Upwork Jobs (upwork-jobs.p.rapidapi.com) Fetcher ---
async function fetchFromUpworkJobsP(params: SearchParams): Promise<JobPoc[]> {
    if (!UPWORK_JOBS_P_HOST || !RAPIDAPI_KEY) {
        console.warn('Upwork Jobs (upwork-jobs.p) API not configured. Skipping.');
        return [];
    }

    // **VERIFY THESE PARAMETERS WITH THE API DOCUMENTATION**
    // Common parameters might be 'q' or 'query' for keywords, 'loc' for location, 'skills', 'page'.
    const queryParams: any = {
        // q: `${params.keywords} ${params.skills || ''}`.trim(), // Example: if 'q' is the search term param
        // location: params.location, // Example: if location is supported
        // page: params.page || 1, // Example: if pagination is supported
        // limit: 10, // Or similar for number of results
    };

    // The provided cURL does not show search query params, so we MUST assume some common ones
    // For now, let's try to pass a 'query' param for keywords + skills
    // And assume it doesn't filter by location, as Upwork jobs are often remote.
    // If location is a specific city for Upwork, you'd need to map it correctly.
    if (params.keywords || params.skills) {
        queryParams.query = `${params.keywords || ''} ${params.skills || ''}`.trim();
    }
    if (params.page) {
        queryParams.page = params.page;
    }
    // queryParams.limit = 10; // A common parameter for number of results per page

    const options: AxiosRequestConfig = {
        method: 'GET',
        url: `https://${UPWORK_JOBS_P_HOST}/jobs`,
        params: queryParams,
        headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': UPWORK_JOBS_P_HOST },
    };

    try {
        const response = await axios.request(options);
        // console.log("UpworkJobsP Response:", JSON.stringify(response.data, null, 2)); // Log to inspect structure

        // **HYPOTHETICAL MAPPING - MUST BE VERIFIED based on actual response structure**
        // Common structures: response.data.jobs, response.data.results, or response.data directly if it's an array
        let jobsArray: any[] = [];
        if (response.data && Array.isArray(response.data)) { // If response.data is the array
            jobsArray = response.data;
        } else if (response.data && Array.isArray(response.data.jobs)) { // If response.data.jobs is the array
            jobsArray = response.data.jobs;
        } else if (response.data && Array.isArray(response.data.results)) { // If response.data.results is the array
            jobsArray = response.data.results;
        }
        // Add more checks if needed based on observed response

        if (jobsArray.length > 0) {
            return jobsArray.map((job: any): JobPoc => {
                const rawDescription = job.description || job.snippet || 'No description available.';
                let jobSnippet = job.snippet;
                if (!jobSnippet && rawDescription && rawDescription !== 'No description available.') {
                    jobSnippet = rawDescription.substring(0, 150) + (rawDescription.length > 150 ? '...' : '');
                }

                return {
                    id: `upwork-jobs-p-${job.id || job.uid || crypto.randomUUID()}`, // Use a unique ID field from the job object
                    sourceApi: 'UpworkJobsP',
                    title: job.title || 'N/A',
                    company: job.client?.name || job.company_name || 'Freelance Client', // Look for client name or company
                    location: job.client?.location?.country || job.location || 'Remote',
                    description: rawDescription,
                    snippet: jobSnippet,
                    url: job.url || job.link, // Look for a URL field
                    datePosted: job.date_created || job.posted_time || job.date_posted, // Look for a date field
                    salary: job.budget?.amount ? `${job.budget.amount} ${job.budget.currency || ''}` : (job.rate?.amount ? `${job.rate.amount}/${job.rate.period || 'hr'}` : undefined),
                };
            });
        }
        return [];
    } catch (e: any) {
        console.error(`Error UpworkJobsP (${UPWORK_JOBS_P_HOST}):`, e.response?.data?.message || e.message);
        // console.error("Full UpworkJobsP error response:", e.response?.data); // Log full error data if available
        return [];
    }
}


// --- LinkedIn Jobs Search (POST endpoint) Fetcher ---
async function fetchFromLinkedInPost(params: SearchParams): Promise<JobPoc[]> {
  // ... (this function remains the same as your last version)
  if (!LINKEDINPOST_HOST || !RAPIDAPI_KEY) {
    console.warn('LinkedIn Jobs Search (POST) API not configured. Skipping.');
    return [];
  }
  const requestData = {
    search_terms: `${params.keywords} ${params.skills || ''}`.trim(),
    location: params.location,
    page: String(params.page || '1'),
  };
  const options: AxiosRequestConfig = {
    method: 'POST',
    url: `https://${LINKEDINPOST_HOST}/`,
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': LINKEDINPOST_HOST,
    },
    data: requestData,
  };
  try {
    const response = await axios.request(options);
    if (response.data && Array.isArray(response.data)) {
      return response.data.map((job: any): JobPoc => {
        const rawDescription = job.job_description || 'No description provided.';
        let jobSnippet;
        if (rawDescription && rawDescription !== 'No description provided.') {
            const textDescription = rawDescription.replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim();
            jobSnippet = textDescription.substring(0, 150) + (textDescription.length > 150 ? '...' : '');
        }
        return {
            id: `linkedinpost-${job.linkedin_job_id || job.job_id || crypto.randomUUID()}`,
            sourceApi: 'LinkedInPostSearch',
            title: job.job_title || 'N/A',
            company: job.company_name || 'N/A',
            location: job.job_location || 'N/A',
            description: rawDescription,
            snippet: jobSnippet,
            url: job.linkedin_job_url || job.job_url,
            datePosted: job.posted_date || job.job_posted_date,
        };
      });
    } return [];
  } catch (e: any) { console.error('Error LinkedInPost:', e.response?.data?.message || e.message); return []; }
}


// --- De-duplication Helper (same as before) ---
function normalizeAndDeduplicateJobs(jobs: JobPoc[]): JobPoc[] {
  // ... (this function remains the same)
  const uniqueJobsMap = new Map<string, JobPoc>();
  for (const job of jobs) {
    const title = (job.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const company = (job.company || '').toLowerCase().trim().replace(/\s+/g, ' ');
    let location = (job.location || '').toLowerCase().trim();
    if (location.includes(',')) location = location.split(',')[0].trim();
    location = location.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    const deduplicationKey = `${title}-${company}-${location}`;
    if (!uniqueJobsMap.has(deduplicationKey)) {
      uniqueJobsMap.set(deduplicationKey, job);
    }
  }
  return Array.from(uniqueJobsMap.values());
}

// --- Main API Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobPoc[] | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
  const { keywords, location, skills, page: pageStr } = req.body;
  if (!keywords || !location) {
    return res.status(400).json({ message: 'Keywords and Location are required.' });
  }
  if (!RAPIDAPI_KEY) {
    console.error('RapidAPI key not configured.');
    return res.status(500).json({ message: 'Server configuration error.' });
  }

  const searchParams: SearchParams = {
    keywords,
    location,
    skills,
    page: pageStr ? parseInt(pageStr as string, 10) : 1
  };

  const fetchPromises: Promise<JobPoc[]>[] = [];

  if (JSEARCH_API_HOST) fetchPromises.push(fetchFromJSearch(searchParams));
  // if (UPWORKJOBS2_HOST) fetchPromises.push(fetchFromUpworkJobs2(searchParams)); // Comment out or remove old one
  if (UPWORK_JOBS_P_HOST) fetchPromises.push(fetchFromUpworkJobsP(searchParams)); // <<< ADD NEW FETCHER
  if (LINKEDINPOST_HOST) fetchPromises.push(fetchFromLinkedInPost(searchParams));

  if (fetchPromises.length === 0) {
    console.warn("No job search APIs are configured. Returning empty results.");
    return res.status(200).json([]);
  }

  try {
    const results = await Promise.allSettled(fetchPromises);
    let allJobs: JobPoc[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allJobs = allJobs.concat(result.value);
      } else if (result.status === 'rejected') { /* Error logged in fetcher */ }
    });

    if (allJobs.length === 0) return res.status(200).json([]);

    const uniqueJobs = normalizeAndDeduplicateJobs(allJobs);
    res.status(200).json(uniqueJobs);
  } catch (error: any) {
    console.error('Error in main job search handler:', error);
    res.status(500).json({ message: 'Failed to fetch jobs.', error: error.message });
  }
}
