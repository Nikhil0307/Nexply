// pages/index.tsx
import Head from 'next/head';
import { useState, useEffect } from 'react';
import JobSearchForm from '@/components/JobSearchForm';
import JobList from '@/components/JobList';
import ResumeInput from '@/components/ResumeInput';
import GeneratedContentDisplay from '@/components/GeneratedContentDisplay';
import type { JobPoc } from '@/pages/api/search-jobs';

interface ManualJobDetails {
  title: string;
  company: string;
  description: string;
}

interface ExtractedResumeData {
  jobTitleKeywords: string;
  skills: string;
  location?: string;
}

const LOCAL_STORAGE_COVER_LETTER_KEY = 'nexply_savedCoverLetter_v2';
const LOCAL_STORAGE_COVER_LETTER_JOB_KEY = 'nexply_savedCoverLetterJobContext_v2';

export default function HomePage() {
  // Form State
  const [searchFormKeywords, setSearchFormKeywords] = useState('');
  const [searchFormLocation, setSearchFormLocation] = useState('');
  const [searchFormSkills, setSearchFormSkills] = useState('');

  // Job Search & Pagination
  const [jobList, setJobList] = useState<JobPoc[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPoc | null>(null);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [jobSearchError, setJobSearchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreJobs, setHasMoreJobs] = useState(false);

  // Manual Job
  const [useManualJobInput, setUseManualJobInput] = useState(false);
  const [manualJobDetails, setManualJobDetails] = useState<ManualJobDetails>({ title: '', company: '', description: '' });

  // Resume
  const [resumeText, setResumeText] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);

  // Cover Letter
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [showCoverLetterDownloadWarning, setShowCoverLetterDownloadWarning] = useState(false);
  const [coverLetterJobContext, setCoverLetterJobContext] = useState<string | null>(null);

  // Interview Questions
  const [generatedInterviewQuestions, setGeneratedInterviewQuestions] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [showQuestionsDownloadWarning, setShowQuestionsDownloadWarning] = useState(false);


  const handleJobSelect = (job: JobPoc) => {
    setSelectedJob(job);
    setUseManualJobInput(false);
    setGeneratedCoverLetter(null);
    setGeneratedInterviewQuestions(null);
    setCoverLetterError(null);
    setQuestionsError(null);
    setShowCoverLetterDownloadWarning(false);
    setShowQuestionsDownloadWarning(false);
    localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY);
  };

  const handleManualJobInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setManualJobDetails(prev => ({ ...prev, [name]: value }));
    if (useManualJobInput) {
        setSelectedJob(null);
    }
  };

  const getJobDetailsForGeneration = (): { title: string; company: string; description: string } | null => {
    if (useManualJobInput) {
      if (manualJobDetails.title && manualJobDetails.company && manualJobDetails.description) {
        return manualJobDetails;
      }
      return null;
    }
    if (selectedJob) {
      return {
        title: selectedJob.title,
        company: selectedJob.company,
        description: selectedJob.description,
      };
    }
    return null;
  };

  const handleGenerateCoverLetter = async () => {
    const jobDetailsForGen = getJobDetailsForGeneration();
    if (!jobDetailsForGen || !resumeText) {
      alert('Please select a job (or fill in manual details) and provide your resume.');
      return;
    }
    setIsGeneratingCoverLetter(true);
    setCoverLetterError(null);
    setGeneratedCoverLetter(null);
    setShowCoverLetterDownloadWarning(false);
    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDetails: jobDetailsForGen, resumeText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGeneratedCoverLetter(data.coverLetter);
      const jobContext = `${jobDetailsForGen.title} at ${jobDetailsForGen.company}`;
      setCoverLetterJobContext(jobContext);
      localStorage.setItem(LOCAL_STORAGE_COVER_LETTER_KEY, data.coverLetter);
      localStorage.setItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY, jobContext);
      setShowCoverLetterDownloadWarning(true);
    } catch (error: any) {
      setCoverLetterError(error.message || 'Failed to generate cover letter.');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };
  
  const handleClearSavedCoverLetter = () => {
    setGeneratedCoverLetter(null);
    setCoverLetterJobContext(null);
    setShowCoverLetterDownloadWarning(false);
    localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY);
  };

  const handleGenerateInterviewQuestions = async () => {
    const jobDetailsForGen = getJobDetailsForGeneration();
    if (!jobDetailsForGen || !resumeText) {
      alert('Please select a job (or fill in manual details) and provide your resume.');
      return;
    }
    setIsGeneratingQuestions(true);
    setQuestionsError(null);
    setGeneratedInterviewQuestions(null);
    setShowQuestionsDownloadWarning(false);
    try {
      const response = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDetails: jobDetailsForGen, resumeText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGeneratedInterviewQuestions(data.questions);
      setShowQuestionsDownloadWarning(true);
    } catch (error: any) {
      setQuestionsError(error.message || 'Failed to generate interview questions.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  useEffect(() => {
    const savedCL = localStorage.getItem(LOCAL_STORAGE_COVER_LETTER_KEY);
    const savedCLJob = localStorage.getItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY);
    if (savedCL) {
      setGeneratedCoverLetter(savedCL);
      if (savedCLJob) setCoverLetterJobContext(savedCLJob);
      setShowCoverLetterDownloadWarning(true);
    }
  }, []);

  const handleJobSearchSubmit = async (
    keywords: string,
    location: string,
    skills: string,
    page: number = 1
  ) => {
    setIsSearchingJobs(true);
    setJobSearchError(null);
    if (page === 1) {
        setJobList([]);
        setSelectedJob(null);
    }
    setCurrentPage(page);

    try {
      const response = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, location, skills, page }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data: JobPoc[] = await response.json();
      
      if (page === 1) {
        setJobList(data);
      } else {
        setJobList(prevJobs => [...prevJobs, ...data]);
      }
      setHasMoreJobs(data.length > 0); // Assuming API returns empty array if no more jobs

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setJobSearchError(message || 'Failed to fetch jobs.');
      setHasMoreJobs(false);
    } finally {
      setIsSearchingJobs(false);
    }
  };
  
  const triggerNewJobSearch = () => {
    if (searchFormKeywords || searchFormSkills) {
        handleJobSearchSubmit(searchFormKeywords, searchFormLocation || "India", searchFormSkills, 1);
    } else {
        setJobSearchError("Please enter keywords or skills, or use resume to suggest terms.");
    }
  };

  const handleExtractKeywordsFromResumeAndSearch = async () => {
    if (!resumeText) {
      alert('Please upload or paste your resume first.');
      return;
    }
    setIsExtractingKeywords(true);
    setJobSearchError(null);
    try {
      const response = await fetch('/api/extract-resume-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to extract from resume.');
      }
      const data: ExtractedResumeData = await response.json();
      
      const newKeywords = data.jobTitleKeywords || "";
      const newSkills = data.skills || "";
      const newLocation = data.location || "India"; // Default location if not found

      setSearchFormKeywords(newKeywords);
      setSearchFormSkills(newSkills);
      setSearchFormLocation(newLocation);
      
      if (newKeywords || newSkills) {
        await handleJobSearchSubmit(newKeywords, newLocation, newSkills, 1);
      } else {
        alert("Could not extract significant keywords from resume to auto-search. Please enter terms manually.")
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setJobSearchError(`Resume analysis failed: ${message}`);
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  const handleNextPage = () => {
    if (hasMoreJobs && !isSearchingJobs) {
      const nextPage = currentPage + 1;
      handleJobSearchSubmit(searchFormKeywords, searchFormLocation || "India", searchFormSkills, nextPage);
    }
  };
  
  const currentJobForGeneration = getJobDetailsForGeneration();
  const canGenerate = !!(currentJobForGeneration && resumeText && !isParsingResume);

  return (
    <>
      <Head>
        <title>Nexply - Apply Smarter, Faster</title>
        <meta name="description" content="Nexply: AI-powered job discovery and application assistance." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 selection:bg-sky-700 selection:text-white">
        <header className="text-center mb-10 md:mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100">
            Nexply <span className="text-sky-400">- Apply Smarter</span>
          </h1>
          <p className="mt-3 text-lg text-slate-300 max-w-2xl mx-auto">
            Discover opportunities and craft compelling application materials with AI.
          </p>
        </header>

        <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <section className="md:col-span-1 space-y-6">
            <JobSearchForm
              onSearch={triggerNewJobSearch}
              isLoading={isSearchingJobs || isExtractingKeywords}
              initialKeywords={searchFormKeywords}
              initialLocation={searchFormLocation}
              initialSkills={searchFormSkills}
              setExternalKeywords={setSearchFormKeywords}
              setExternalLocation={setSearchFormLocation}
              setExternalSkills={setSearchFormSkills}
            />
            {jobSearchError && (
              <div className="p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm shadow-md">
                {jobSearchError}
              </div>
            )}
            {isSearchingJobs && currentPage === 1 && (
              <p className="text-sky-400 px-4 animate-pulse">Loading jobs...</p>
            )}
            
            {!isSearchingJobs && jobList.length === 0 && !jobSearchError && (
                 <div className="text-slate-400 p-6 text-center bg-slate-800 shadow-xl rounded-lg">
                    Upload resume to auto-fill search or enter terms manually.
                 </div>
            )}

            {jobList.length > 0 && (
              <div className="bg-slate-800 shadow-xl rounded-lg overflow-hidden">
                <h2 className="text-xl font-semibold p-4 border-b border-slate-700 text-slate-100">Job Results ({jobList.length})</h2>
                <JobList
                    jobs={jobList}
                    selectedJobId={selectedJob?.id || null}
                    onJobSelect={handleJobSelect}
                />
                {isSearchingJobs && currentPage > 1 && <p className="text-sky-400 p-3 text-center animate-pulse">Loading more jobs...</p>}
                {hasMoreJobs && !isSearchingJobs && jobList.length > 0 && (
                  <div className="p-4 border-t border-slate-700">
                    <button
                      onClick={handleNextPage}
                      disabled={isSearchingJobs}
                      className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:bg-slate-600 disabled:text-slate-400 transition-colors duration-150"
                    >
                      Load More Jobs (Page {currentPage + 1})
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="md:col-span-2 space-y-6">
            <div className="p-4 sm:p-6 bg-slate-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-semibold text-slate-100">
                  {useManualJobInput ? "Manually Entered Job" : selectedJob ? "Selected Job Details" : "Job Details"}
                </span>
                <button
                    onClick={() => {
                      const newUseManualState = !useManualJobInput;
                      setUseManualJobInput(newUseManualState);
                      if (newUseManualState) {
                          setSelectedJob(null);
                          setGeneratedCoverLetter(null);
                          setGeneratedInterviewQuestions(null);
                          setShowCoverLetterDownloadWarning(false);
                          setShowQuestionsDownloadWarning(false);
                          localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_KEY);
                          localStorage.removeItem(LOCAL_STORAGE_COVER_LETTER_JOB_KEY);
                      }
                    }}
                    className="text-sm text-sky-400 hover:text-sky-300 hover:underline"
                >
                    {useManualJobInput ? "Use Job from List" : "Or Enter Job Manually"}
                </button>
              </div>
              <hr className="border-slate-700 my-3" />

              {useManualJobInput ? (
                <div className="space-y-4 mt-2">
                   <p className="text-sm text-slate-400">Manually enter job details if you found a job elsewhere.</p>
                  <div>
                    <label htmlFor="manualTitle" className="block text-sm font-medium text-slate-300">Job Title</label>
                    <input type="text" name="title" id="manualTitle" value={manualJobDetails.title} onChange={handleManualJobInputChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm" required />
                  </div>
                  <div>
                    <label htmlFor="manualCompany" className="block text-sm font-medium text-slate-300">Company</label>
                    <input type="text" name="company" id="manualCompany" value={manualJobDetails.company} onChange={handleManualJobInputChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm" required/>
                  </div>
                  <div>
                    <label htmlFor="manualDescription" className="block text-sm font-medium text-slate-300">Job Description</label>
                    <textarea name="description" id="manualDescription" rows={6} value={manualJobDetails.description} onChange={handleManualJobInputChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm" placeholder="Paste the full job description here..." required></textarea>
                  </div>
                </div>
              ) : selectedJob ? (
                <div className="mt-2 space-y-2">
                  <h3 className="text-xl font-bold text-sky-400">{selectedJob.title}</h3>
                  <p className="text-md text-slate-300">{selectedJob.company} - {selectedJob.location}</p>
                  <h4 className="text-sm font-semibold mt-3 text-slate-300">Full Description:</h4>
                  <pre className="mt-1 text-sm text-slate-200 whitespace-pre-wrap bg-slate-900 p-3 rounded-md max-h-60 overflow-y-auto">
                    {selectedJob.description}
                  </pre>
                  {selectedJob.snippet && selectedJob.snippet !== selectedJob.description && (
                    <>
                      <h4 className="text-sm font-semibold mt-2 text-slate-300">Snippet:</h4>
                       <pre className="mt-1 text-xs text-slate-300 whitespace-pre-wrap bg-slate-900 p-2 rounded-md max-h-32 overflow-y-auto">
                        {selectedJob.snippet}
                      </pre>
                    </>
                  )}
                  {selectedJob.url && <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline text-sm mt-2 inline-block">View Original Post ↗</a>}
                </div>
              ) : (
                <p className="text-slate-400 mt-2">Select a job from the list or enter details manually to proceed.</p>
              )}
            </div>
            
            <ResumeInput
              resumeText={resumeText}
              setResumeText={setResumeText}
              setIsParsingResume={setIsParsingResume}
              setResumeParseError={setResumeParseError}
            />
            {isParsingResume && <p className="text-sm text-center text-sky-400 p-2 animate-pulse">Parsing resume...</p>}
            {resumeParseError && (
              <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm text-center shadow-md">
                  Resume Error: {resumeParseError}
              </div>
            )}
            
            {resumeText && !isParsingResume && (
                <button
                    onClick={handleExtractKeywordsFromResumeAndSearch}
                    disabled={isExtractingKeywords || isSearchingJobs}
                    className="w-full mt-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 disabled:bg-slate-600 disabled:text-slate-400 transition-colors duration-150"
                >
                    {isExtractingKeywords ? 'Analyzing Resume for Search...' : '✨ Search Jobs with Resume Insights'}
                </button>
            )}

            {canGenerate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-800 shadow-xl rounded-lg mt-4">
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={isGeneratingCoverLetter || isGeneratingQuestions || isExtractingKeywords || isParsingResume}
                  className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:bg-slate-600 disabled:text-slate-400 transition-colors duration-150"
                >
                  {isGeneratingCoverLetter ? 'Generating CL...' : '📄 Generate Cover Letter'}
                </button>
                <button
                  onClick={handleGenerateInterviewQuestions}
                  disabled={isGeneratingCoverLetter || isGeneratingQuestions || isExtractingKeywords || isParsingResume}
                  className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 disabled:bg-slate-600 disabled:text-slate-400 transition-colors duration-150"
                >
                  {isGeneratingQuestions ? 'Generating Qs...' : '❓ Generate Interview Questions'}
                </button>
              </div>
            )}
            
            {generatedCoverLetter && showCoverLetterDownloadWarning && (
                 <div className="my-2 p-3 bg-yellow-900/40 border-l-4 border-yellow-500 text-yellow-200 rounded-r-md shadow">
                    <p className="text-sm font-medium">Cover Letter Ready!</p>
                    <p className="text-xs mt-1">
                        {coverLetterJobContext ? `For: ${coverLetterJobContext}. ` : ""}
                        This is saved in your browser. Copy or download it.
                    </p>
                    <button onClick={handleClearSavedCoverLetter} className="mt-1.5 text-xs text-yellow-100 hover:underline font-semibold">Clear Saved Cover Letter</button>
                 </div>
            )}
            <GeneratedContentDisplay
              title="Generated Cover Letter"
              content={generatedCoverLetter}
              isLoading={isGeneratingCoverLetter}
              error={coverLetterError}
            />

            {generatedInterviewQuestions && showQuestionsDownloadWarning && (
                 <div className="my-2 p-3 bg-sky-900/40 border-l-4 border-sky-500 text-sky-200 rounded-r-md shadow">
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

        <footer className="text-center mt-12 py-6 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Nexply - Powered by Gemini & Next.js
          </p>
          <p className="text-xs text-slate-500 mt-1">
            UI Enhanced for a Modern Dark Theme
          </p>
        </footer>
      </div>
    </>
  );
}
