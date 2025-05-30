// pages/api/search-jobs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosRequestConfig } from 'axios';

export interface JobPoc {
  id: string;
  sourceApi: string;
  title: string;
  company: string;
  location: string;
  description: string;
  snippet?: string;
  url?: string;
  datePosted?: string;
  salary?: string;
}

// Define a more specific type for incoming job data from APIs
// This is a generic example; ideally, you'd have specific types for each API's response structure
type ExternalJobData = Record<string, any>;


interface ErrorResponse { message: string; error?: unknown; } // Changed any to unknown
interface SearchParams { keywords: string; location: string; skills?: string; page?: number; }

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const JSEARCH_API_HOST = process.env.RAPIDAPI_JSEARCH_HOST;
const UPWORKJOBS2_HOST = process.env.RAPIDAPI_UPWORKJOBS2_HOST;
const LINKEDINPOST_HOST = process.env.RAPIDAPI_LINKEDINPOST_HOST;

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
      return response.data.data.map((job: ExternalJobData): JobPoc => { // Typed job
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
  } catch (e: unknown) { // Typed e
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Error JSearch:', (e as any).response?.data?.message || errorMessage); // Accessing response needs care
    return [];
  }
}

async function fetchFromUpworkJobs2(params: SearchParams): Promise<JobPoc[]> {
    if (!UPWORKJOBS2_HOST || !RAPIDAPI_KEY) {
        console.warn('Upwork Jobs API2 not configured. Skipping.');
        return [];
    }
    const queryParams: Record<string, string | number> = { limit: 10 }; // Typed queryParams
    if (params.keywords) {
        queryParams.q = `${params.keywords} ${params.skills || ''}`.trim();
    }

    const options: AxiosRequestConfig = {
        method: 'GET',
        url: `https://${UPWORKJOBS2_HOST}/active-freelance-1h`,
        params: queryParams,
        headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': UPWORKJOBS2_HOST },
    };
    try {
        const response = await axios.request(options);
        if (response.data && Array.isArray(response.data.results)) {
            return response.data.results.map((job: ExternalJobData): JobPoc => ({ // Typed job
                id: `upworkjobs2-${job.id_upwork || crypto.randomUUID()}`,
                sourceApi: 'UpworkJobs2',
                title: job.title_upwork || 'N/A',
                company: job.client_upwork?.name || 'Freelance Client',
                location: job.client_upwork?.location || 'Remote',
                description: job.snippet_upwork || 'No description available.',
                snippet: job.snippet_upwork,
                url: job.url_upwork,
                datePosted: job.date_posted_upwork,
                salary: job.budget_upwork?.amount ? `${job.budget_upwork.amount} ${job.budget_upwork.currency_code}` : undefined,
            }));
        } return [];
    } catch (e: unknown) { // Typed e
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Error UpworkJobs2:', (e as any).response?.data?.message || errorMessage);
        return [];
    }
}

async function fetchFromLinkedInPost(params: SearchParams): Promise<JobPoc[]> {
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
      return response.data.map((job: ExternalJobData): JobPoc => { // Typed job
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
  } catch (e: unknown) { // Typed e
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Error LinkedInPost:', (e as any).response?.data?.message || errorMessage);
    return [];
  }
}

function normalizeAndDeduplicateJobs(jobs: JobPoc[]): JobPoc[] {
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
  if (UPWORKJOBS2_HOST) fetchPromises.push(fetchFromUpworkJobs2(searchParams));
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
  } catch (error: unknown) { // Typed error
    console.error('Error in main job search handler:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'Failed to fetch jobs.', error: errorMessage });
  }
}
