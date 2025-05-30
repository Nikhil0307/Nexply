// pages/index.tsx
import Head from 'next/head';
import { useState, useEffect } from 'react';
import JobSearchForm from '@/components/JobSearchForm'; // Client-side component
import JobList from '@/components/JobList';             // Client-side component
import ResumeInput from '@/components/ResumeInput';       // Client-side component
import GeneratedContentDisplay from '@/components/GeneratedContentDisplay'; // Client-side component
import type { JobPoc } from '@/pages/api/search-jobs'; // Type import is fine

interface ManualJobDetails {
  title: string;
  company: string;
  description: string;
}

const LOCAL_STORAGE_COVER_LETTER_KEY = 'jobSearcherPoc_savedCoverLetter';
const LOCAL_STORAGE_COVER_LETTER_JOB_KEY = 'jobSearcherPoc_savedCoverLetterJobContext';

export default function HomePage() {
  // State for JobSearchForm fields
  const [searchFormKeywords, setSearchFormKeywords] = useState('');
  const [searchFormLocation, setSearchFormLocation] = useState('');
  const [searchFormSkills, setSearchFormSkills] = useState('');

  // Job Search Results
  const [jobList, setJobList] = useState<JobPoc[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPoc | null>(null);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [jobSearchError, setJobSearchError] = useState<string | null>(null);

  // Manual Job Input
  const [useManualJobInput, setUseManualJobInput] = useState(false);
  const [manualJobDetails, setManualJobDetails] = useState<ManualJobDetails>({ title: '', company: '', description: '' });

  // Resume
  const [resumeText, setResumeText] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);

  // Cover Letter Generation
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [showCoverLetterDownloadWarning, setShowCoverLetterDownloadWarning] = useState(false);
  const [coverLetterJobContext, setCoverLetterJobContext] = useState<string | null>(null);

  // Interview Questions Generation
  const [generatedInterviewQuestions, setGeneratedInterviewQuestions] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [showQuestionsDownloadWarning, setShowQuestionsDownloadWarning] = useState(false);

  // Load saved cover letter from localStorage
  useEffect(() => {
    const savedCL = localStorage.getItem(LOCAL_STORAGE_COVER_LETTER_KEY);
    const savedCLJob = localStorage.getItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY);
    if (savedCL) {
      setGeneratedCoverLetter(savedCL);
      if (savedCLJob) setCoverLetterJobContext(savedCLJob);
      setShowCoverLetterDownloadWarning(true);
    }
  }, []);

  const handleJobSearchSubmit = async (keywords: string, location: string, skills: string) => {
    setIsSearchingJobs(true);
    setJobSearchError(null);
    setJobList([]);
    setSelectedJob(null);
    try {
      const response = await fetch('/api/search-jobs', { // API Call
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, location, skills }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data: JobPoc[] = await response.json();
      setJobList(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setJobSearchError(message || 'Failed to fetch jobs.');
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const handleExtractKeywordsFromResume = async () => {
    if (!resumeText) {
      alert('Please upload or paste your resume first.');
      return;
    }
    setIsExtractingKeywords(true);
    setJobSearchError(null);
    try {
      const response = await fetch('/api/extract-resume-keywords', { // API Call
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to extract keywords.');
      }
      const data = await response.json();
      const keywordsFromResume = data.keywords || "";
      const allExtracted = keywordsFromResume.split(',').map((k: string) => k.trim()).filter(Boolean);
      
      setSearchFormKeywords(allExtracted.slice(0, Math.min(3, allExtracted.length)).join(', '));
      setSearchFormSkills(allExtracted.join(', '));
      // setSearchFormLocation(''); // Optionally clear location or try to infer

      alert('Search fields updated from resume. Review and click "Search Jobs".');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setJobSearchError(`Keyword extraction failed: ${message}`);
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  const handleJobSelect = (job: JobPoc) => {
    setSelectedJob(job);
    setUseManualJobInput(false);
    setGeneratedInterviewQuestions(null);
    setShowQuestionsDownloadWarning(false);
    setCoverLetterError(null);
    setQuestionsError(null);
    // Do not clear generatedCoverLetter here to keep localStorage persistence logic simple
  };

  const handleManualJobInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setManualJobDetails(prev => ({ ...prev, [name]: value }));
  };

  const getJobDetailsForGeneration = (): { title: string; company: string; description: string } | null => {
    if (useManualJobInput) {
      return (manualJobDetails.title && manualJobDetails.company && manualJobDetails.description) ? manualJobDetails : null;
    }
    if (selectedJob) {
      return { title: selectedJob.title, company: selectedJob.company, description: selectedJob.description };
    }
    return null;
  };

  const handleGenerateCoverLetter = async () => {
    const jobDetailsForGen = getJobDetailsForGeneration();
    if (!jobDetailsForGen || !resumeText) {
      alert('Please provide job details and resume content.');
      return;
    }
    setIsGeneratingCoverLetter(true);
    setCoverLetterError(null);
    setGeneratedCoverLetter(null);
    setShowCoverLetterDownloadWarning(false);
    setCoverLetterJobContext(null);

    try {
      const response = await fetch('/api/generate-cover-letter', { // API Call
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDetails: jobDetailsForGen, resumeText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Cover Letter Gen HTTP error: ${response.status}`);
      }
      const data = await response.json();
      setGeneratedCoverLetter(data.coverLetter);
      const jobContext = `${jobDetailsForGen.title} at ${jobDetailsForGen.company}`;
      setCoverLetterJobContext(jobContext);
      localStorage.setItem(LOCAL_STORAGE_COVER_LETTER_KEY, data.coverLetter);
      localStorage.setItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY, jobContext);
      setShowCoverLetterDownloadWarning(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setCoverLetterError(message || 'Failed to generate cover letter.');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleClearSavedCoverLetter = () => {
    localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY);
    setGeneratedCoverLetter(null);
    setShowCoverLetterDownloadWarning(false);
    setCoverLetterJobContext(null);
    alert('Saved cover letter cleared.');
  };

  const handleGenerateInterviewQuestions = async () => {
    const jobDetailsForGen = getJobDetailsForGeneration();
     if (!jobDetailsForGen || !resumeText) {
      alert('Please provide job details and resume content.');
      return;
    }
    setIsGeneratingQuestions(true);
    setQuestionsError(null);
    setGeneratedInterviewQuestions(null);
    setShowQuestionsDownloadWarning(false);
    try {
      const response = await fetch('/api/generate-interview-questions', { // API Call
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDetails: jobDetailsForGen, resumeText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Interview Questions Gen HTTP error: ${response.status}`);
      }
      const data = await response.json();
      setGeneratedInterviewQuestions(data.questions);
      setShowQuestionsDownloadWarning(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setQuestionsError(message || 'Failed to generate interview questions.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const currentJobForGeneration = getJobDetailsForGeneration();
  const canGenerate = !!(currentJobForGeneration && resumeText && !isParsingResume);

  return (
    <>
      <Head>
        <title>AI Job Assistant POC</title>
        <meta name="description" content="AI-powered job searching and application material generation." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">
            AI Job Assistant <span className="text-indigo-600">(POC)</span>
          </h1>
          <p className="mt-2 text-lg text-gray-600">Find jobs, generate materials, and prepare for interviews.</p>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <section className="md:col-span-1 space-y-6">
            <JobSearchForm
              onSearch={handleJobSearchSubmit}
              isLoading={isSearchingJobs}
              initialKeywords={searchFormKeywords}
              initialLocation={searchFormLocation}
              initialSkills={searchFormSkills}
              setExternalKeywords={setSearchFormKeywords}
              setExternalLocation={setSearchFormLocation}
              setExternalSkills={setSearchFormSkills}
            />
            {jobSearchError && <p className="text-red-500 text-sm px-4 py-2 bg-red-100 rounded">{jobSearchError}</p>}
            {isSearchingJobs && <p className="text-indigo-600 px-4 animate-pulse">Loading jobs...</p>}
            {!isSearchingJobs && jobList.length > 0 && (
              <div className="bg-white shadow-md rounded-lg">
                <h2 className="text-xl font-semibold p-4 border-b">Job Results ({jobList.length})</h2>
                <JobList jobs={jobList} selectedJobId={selectedJob?.id || null} onJobSelect={handleJobSelect} />
              </div>
            )}
            {!isSearchingJobs && jobList.length === 0 && !jobSearchError && (
                 <p className="text-gray-500 p-4 text-center bg-white shadow-md rounded-lg">
                    Enter search criteria or use your resume to suggest terms.
                 </p>
            )}
          </section>

          <section className="md:col-span-2 space-y-6">
            <div className="p-4 bg-white shadow-md rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-semibold text-gray-700">
                  {useManualJobInput ? "Manually Entered Job" : selectedJob ? "Selected Job" : "Job Details"}
                </span>
                <button
                    onClick={() => {
                      setUseManualJobInput(!useManualJobInput);
                      if (!useManualJobInput) { 
                        setSelectedJob(null); 
                        // Clear other states if switching to manual and deselecting a job
                        setGeneratedInterviewQuestions(null); setShowQuestionsDownloadWarning(false);
                        setQuestionsError(null);
                        // Optionally clear cover letter if not tied to localStorage strictly
                        // setGeneratedCoverLetter(null); setShowCoverLetterDownloadWarning(false); setCoverLetterError(null);
                      }
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                    {useManualJobInput ? "Use Job from List" : "Or Enter Job Manually"}
                </button>
              </div>
              {useManualJobInput ? (
                <div className="space-y-3 mt-2 border-t pt-3">
                   <p className="text-sm text-gray-500">Manually enter job details if you found a job elsewhere.</p>
                  <div>
                    <label htmlFor="manualTitle" className="block text-sm font-medium text-gray-700">Job Title</label>
                    <input type="text" name="title" id="manualTitle" value={manualJobDetails.title} onChange={handleManualJobInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                  </div>
                  <div>
                    <label htmlFor="manualCompany" className="block text-sm font-medium text-gray-700">Company</label>
                    <input type="text" name="company" id="manualCompany" value={manualJobDetails.company} onChange={handleManualJobInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required/>
                  </div>
                  <div>
                    <label htmlFor="manualDescription" className="block text-sm font-medium text-gray-700">Job Description</label>
                    <textarea name="description" id="manualDescription" rows={6} value={manualJobDetails.description} onChange={handleManualJobInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Paste the full job description here..." required></textarea>
                  </div>
                </div>
              ) : selectedJob ? (
                <div className="mt-2 border-t pt-3">
                  <h3 className="text-lg font-bold text-indigo-700">{selectedJob.title}</h3>
                  <p className="text-md text-gray-700">{selectedJob.company} - {selectedJob.location}</p>
                  <h4 className="text-sm font-semibold mt-2 text-gray-600">Full Description:</h4>
                  <pre className="mt-1 text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                    {selectedJob.description}
                  </pre>
                  {selectedJob.url && <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm mt-2 inline-block">View Original Post</a>}
                </div>
              ) : (
                <p className="text-gray-500 mt-2 border-t pt-3">Select a job from the list or enter details manually to proceed.</p>
              )}
            </div>
            
            <ResumeInput
              resumeText={resumeText}
              setResumeText={setResumeText}
              setIsParsingResume={setIsParsingResume}
              setResumeParseError={setResumeParseError}
            />
            {isParsingResume && <p className="text-sm text-center text-indigo-600 p-2 animate-pulse">Parsing resume...</p>}
            {resumeParseError && <p className="text-sm text-center text-red-600 p-2 bg-red-100 rounded">Resume Error: {resumeParseError}</p>}
            
            {resumeText && !isParsingResume && (
                <button
                    onClick={handleExtractKeywordsFromResume}
                    disabled={isExtractingKeywords}
                    className="w-full mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400"
                >
                    {isExtractingKeywords ? 'Analyzing Resume...' : 'Suggest Search Terms from Resume'}
                </button>
            )}

            {canGenerate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white shadow-md rounded-lg mt-4">
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={isGeneratingCoverLetter || isGeneratingQuestions || isExtractingKeywords}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                >
                  {isGeneratingCoverLetter ? 'Generating CL...' : 'Generate Cover Letter'}
                </button>
                <button
                  onClick={handleGenerateInterviewQuestions}
                  disabled={isGeneratingCoverLetter || isGeneratingQuestions || isExtractingKeywords}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {isGeneratingQuestions ? 'Generating Qs...' : 'Generate Interview Questions'}
                </button>
              </div>
            )}
            
            {generatedCoverLetter && showCoverLetterDownloadWarning && (
                 <div className="my-2 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-md">
                    <p className="text-sm font-medium">Cover Letter Ready!</p>
                    <p className="text-xs mt-1">
                        {coverLetterJobContext ? `For: ${coverLetterJobContext}. ` : ""}
                        This is saved in your browser. Copy or download it.
                    </p>
                    <button onClick={handleClearSavedCoverLetter} className="mt-1.5 text-xs text-yellow-900 hover:underline font-semibold">Clear Saved Cover Letter</button>
                 </div>
            )}
            <GeneratedContentDisplay
              title="Generated Cover Letter"
              content={generatedCoverLetter}
              isLoading={isGeneratingCoverLetter}
              error={coverLetterError}
            />

            {generatedInterviewQuestions && showQuestionsDownloadWarning && (
                 <div className="my-2 p-3 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-r-md">
                     <p className="text-sm font-medium">Interview Questions Ready!</p>
                    <p className="text-xs mt-1">Remember to copy or note down these questions.</p>
                 </div>
            )}
            <GeneratedContentDisplay
              title="Generated Interview Questions"
              content={generatedInterviewQuestions}
              isLoading={isGeneratingQuestions}
              error={questionsError}
            />
          </section>
        </main>

        <footer className="text-center mt-12 py-4 border-t border-gray-300">
          <p className="text-sm text-gray-600">AI Job Assistant (POC) - Powered by Gemini & Next.js</p>
        </footer>
      </div>
    </>
  );
}
