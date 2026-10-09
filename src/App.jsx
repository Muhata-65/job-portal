import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, Clock3, Filter, MapPin, Search, Send, Sparkles, X,
} from 'lucide-react'
import './App.css'

const SavedJobsContext = createContext(null)
const JOBS_API = 'https://www.arbeitnow.com/api/job-board-api'
const PAGE_SIZE = 6

const sampleJobs = [
  { slug: 'product-designer-northstar', title: 'Product Designer', company_name: 'Northstar', location: 'New York, NY', remote: false, job_types: ['Full-time'], tags: ['Design', 'Product'], created_at: '2026-10-08', description: 'Shape thoughtful tools for people doing their best work. Partner closely with product and engineering to take ideas from early sketches through launch.\n\nYou will own end-to-end product experiences, bring clarity to complex workflows, and help us build a design practice that values craft and curiosity.', url: 'https://example.com/jobs/product-designer-northstar' },
  { slug: 'frontend-engineer-fieldnotes', title: 'Frontend Engineer', company_name: 'Fieldnotes', location: 'Remote, US', remote: true, job_types: ['Full-time'], tags: ['Engineering', 'React'], created_at: '2026-10-07', description: 'Build fast, accessible interfaces for a growing team of researchers and creators. You will work in React, collaborate across disciplines, and have room to influence our frontend foundations.\n\nWe care about the details, but we care just as much about being kind collaborators.', url: 'https://example.com/jobs/frontend-engineer-fieldnotes' },
  { slug: 'brand-strategist-common-room', title: 'Brand Strategist', company_name: 'Common Room', location: 'Brooklyn, NY', remote: false, job_types: ['Full-time'], tags: ['Marketing', 'Creative'], created_at: '2026-10-06', description: 'Help ambitious teams find the words and identity that make their work unmistakable. You will lead discovery, turn sharp insights into clear positioning, and guide creative partners through meaningful brand launches.', url: 'https://example.com/jobs/brand-strategist-common-room' },
  { slug: 'data-analyst-goodthings', title: 'Data Analyst', company_name: 'Goodthings', location: 'Remote, North America', remote: true, job_types: ['Contract'], tags: ['Data', 'Analytics'], created_at: '2026-10-05', description: 'Make good data easier to act on. Partner with teams across the business to build trusted reporting, investigate customer behavior, and turn open questions into decisions.\n\nSQL fluency and a healthy respect for context are essential.', url: 'https://example.com/jobs/data-analyst-goodthings' },
  { slug: 'people-operations-luma', title: 'People Operations Lead', company_name: 'Luma Works', location: 'Austin, TX', remote: false, job_types: ['Full-time'], tags: ['Operations', 'People'], created_at: '2026-10-04', description: 'Build the employee experience behind a company doing ambitious, thoughtful work. From onboarding to manager support, you will make our people operations feel human, clear, and dependable.', url: 'https://example.com/jobs/people-operations-luma' },
  { slug: 'product-manager-sunday', title: 'Product Manager', company_name: 'Sunday Studio', location: 'Remote, US', remote: true, job_types: ['Full-time'], tags: ['Product', 'Strategy'], created_at: '2026-10-03', description: 'Bring focus to a small, independent product team. Define the right problems, make smart tradeoffs, and help a diverse group of people deliver products customers love.', url: 'https://example.com/jobs/product-manager-sunday' },
  { slug: 'content-designer-wildflower', title: 'Content Designer', company_name: 'Wildflower', location: 'Chicago, IL', remote: false, job_types: ['Part-time'], tags: ['Design', 'Writing'], created_at: '2026-10-02', description: 'Make every word earn its place. Collaborate with design, support, and product teams to create clear, useful language across our digital experience.', url: 'https://example.com/jobs/content-designer-wildflower' },
  { slug: 'customer-success-orbit', title: 'Customer Success Partner', company_name: 'Orbit', location: 'Remote, US', remote: true, job_types: ['Full-time'], tags: ['Customer Success', 'Operations'], created_at: '2026-10-01', description: 'Help independent teams get more from the tools they already love. Build lasting relationships, share practical guidance, and bring customer insight back to the people building the product.', url: 'https://example.com/jobs/customer-success-orbit' },
  { slug: 'visual-designer-kinfolk', title: 'Visual Designer', company_name: 'Kinfolk Market', location: 'Portland, OR', remote: false, job_types: ['Contract'], tags: ['Design', 'Creative'], created_at: '2026-09-30', description: 'Create a visual world that feels both distinctive and welcoming. This contract role spans campaign work, product moments, and a little bit of everything in between.', url: 'https://example.com/jobs/visual-designer-kinfolk' },
]

function normalizeJob(job, index) {
  const description = new DOMParser().parseFromString(job.description || '', 'text/html').body.textContent || ''
  const createdAt = typeof job.created_at === 'number'
    ? new Date(job.created_at * (job.created_at < 10_000_000_000 ? 1000 : 1))
    : new Date(job.created_at || Date.now())
  return {
    id: job.slug || `${job.company_name || 'company'}-${index}`,
    title: job.title || 'Untitled role',
    company: job.company_name || job.company || 'Independent company',
    location: job.location || (job.remote ? 'Remote' : 'Location not listed'),
    remote: Boolean(job.remote),
    types: Array.isArray(job.job_types) ? job.job_types : [],
    tags: Array.isArray(job.tags) ? job.tags : [],
    createdAt,
    description: description.trim() || 'The team has not added a description yet. Visit the original listing for more details.',
    url: job.url || '',
  }
}

function SavedJobsProvider({ children }) {
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('goodwork-saved-jobs') || '[]') } catch { return [] }
  })

  useEffect(() => localStorage.setItem('goodwork-saved-jobs', JSON.stringify(savedIds)), [savedIds])

  function toggleSaved(id) {
    setSavedIds((current) => current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id])
  }

  return <SavedJobsContext.Provider value={{ savedIds, toggleSaved }}>{children}</SavedJobsContext.Provider>
}

function useSavedJobs() {
  return useContext(SavedJobsContext)
}

function useJobs() {
  const [jobs, setJobs] = useState([])
  const [status, setStatus] = useState('loading')
  const [usingSample, setUsingSample] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(JOBS_API, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Job feed returned ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (!Array.isArray(payload.data)) throw new Error('The job feed returned an unexpected response.')
        setJobs(payload.data.map(normalizeJob))
        setUsingSample(false)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setJobs(sampleJobs.map((job, index) => normalizeJob({ ...job, url: '' }, index)))
        setUsingSample(true)
        setStatus('error')
      })

    return () => controller.abort()
  }, [reloadKey])

  function retry() {
    setStatus('loading')
    setReloadKey((key) => key + 1)
  }

  return { jobs, status, usingSample, retry }
}

function formatDate(date) {
  if (Number.isNaN(date.getTime())) return 'Recently'
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CompanyMark({ name }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <span className={`company-mark tone-${initials.charCodeAt(0) % 5}`} aria-hidden="true">{initials}</span>
}

function Header() {
  const { savedIds } = useSavedJobs()
  const location = useLocation()
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" to="/" aria-label="Goodwork home"><span className="wordmark-icon"><Sparkles size={17} /></span>goodwork<span className="wordmark-period">.</span></Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link className={location.pathname === '/' ? 'nav-link active' : 'nav-link'} to="/">Find a job</Link>
          <Link className={location.pathname === '/saved' ? 'nav-link active' : 'nav-link'} to="/saved">Saved jobs <span className="saved-count">{savedIds.length}</span></Link>
        </nav>
        <a className="for-employers" href="https://www.arbeitnow.com/" target="_blank" rel="noreferrer">For employers <ArrowUpRight size={15} /></a>
      </div>
    </header>
  )
}

function SearchHero({ onSearch }) {
  const [term, setTerm] = useState('')
  const [location, setLocation] = useState('')
  function submit(event) {
    event.preventDefault()
    onSearch(term, location)
    document.querySelector('#job-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="hero-section">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> GOOD WORK, GOOD PEOPLE</div>
        <h1>Find work that<br /><span>feels like you.</span></h1>
        <p>Thoughtful opportunities for the way you want to work. Your next chapter starts here.</p>
        <form className="hero-search" onSubmit={submit}>
          <label className="hero-field"><Search size={18} /><span className="visually-hidden">Job title or keyword</span><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Role, skill, or company" /></label>
          <span className="search-divider" />
          <label className="hero-field location-field"><MapPin size={18} /><span className="visually-hidden">Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or remote" /></label>
          <button className="search-submit" type="submit">Find jobs <ArrowRight size={16} /></button>
        </form>
        <div className="hero-note"><span>Fresh opportunities</span><span className="note-dot" /> New roles added every day</div>
      </div>
      <div className="hero-art" aria-label="A bright, collaborative studio workspace">
        <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=85" alt="A team sharing ideas around a studio table" />
        <div className="art-badge"><span className="badge-sparkle"><Sparkles size={15} /></span><span><b>Made for your next move</b><small>Good people. Real work.</small></span></div>
        <span className="art-sticker">A little more<br />meaning, please.</span>
      </div>
    </section>
  )
}

function FilterPanel({ jobs, category, setCategory, type, setType, place, setPlace, reset, resetPage }) {
  const categories = [...new Set(jobs.flatMap((job) => job.tags).filter(Boolean))].slice(0, 30)
  const types = [...new Set(jobs.flatMap((job) => job.types).filter(Boolean))]
  return (
    <aside className="filter-panel" aria-label="Job filters">
      <div className="filter-heading"><span><Filter size={16} /> Filters</span><button type="button" onClick={reset}>Clear all</button></div>
      <div className="filter-group">
        <label htmlFor="place-filter">Location</label>
        <div className="filter-input-wrap"><MapPin size={15} /><input id="place-filter" value={place} onChange={(event) => { setPlace(event.target.value); resetPage() }} placeholder="Anywhere" /></div>
        <label className="remote-check"><input type="checkbox" checked={place.toLowerCase() === 'remote'} onChange={(event) => { setPlace(event.target.checked ? 'remote' : ''); resetPage() }} /><span className="custom-check"><Check size={12} /></span> Remote friendly</label>
      </div>
      <div className="filter-group">
        <label htmlFor="type-filter">Job type</label>
        <div className="select-wrap"><select id="type-filter" value={type} onChange={(event) => { setType(event.target.value); resetPage() }}><option value="">All types</option>{(types.length ? types : ['Full-time', 'Part-time', 'Contract']).map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></div>
      </div>
      <div className="filter-group category-group">
        <span className="filter-label">Category</span>
        {['All categories', ...categories].slice(0, 9).map((option) => {
          const value = option === 'All categories' ? '' : option
          return <button key={option} type="button" className={`category-option ${category === value ? 'selected' : ''}`} onClick={() => { setCategory(value); resetPage() }}><span className="category-radio" />{option}</button>
        })}
      </div>
      <div className="filter-aside-note"><Sparkles size={15} /><span>Find a role that fits your life, not the other way around.</span></div>
    </aside>
  )
}

function JobCard({ job }) {
  const { savedIds, toggleSaved } = useSavedJobs()
  const isSaved = savedIds.includes(job.id)
  return (
    <article className="job-card">
      <div className="job-card-top"><CompanyMark name={job.company} /><span className="posted-date"><Clock3 size={13} /> {formatDate(job.createdAt)}</span><button type="button" className={`save-button ${isSaved ? 'is-saved' : ''}`} onClick={() => toggleSaved(job.id)} aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} aria-pressed={isSaved}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
      <Link to={`/jobs/${encodeURIComponent(job.id)}`} className="job-title-link"><h3>{job.title}</h3><ArrowUpRight className="title-arrow" size={17} /></Link>
      <div className="company-name">{job.company}</div>
      <div className="job-meta"><span><MapPin size={14} />{job.location}</span>{job.types[0] && <span><BriefcaseBusiness size={14} />{job.types[0]}</span>}</div>
      <p className="job-excerpt">{job.description.replace(/\s+/g, ' ').slice(0, 126)}{job.description.length > 126 ? '…' : ''}</p>
      <div className="job-card-bottom"><div className="tag-list">{job.tags.slice(0, 2).map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}{job.remote && <span className="job-tag remote-tag">Remote</span>}</div><Link className="details-link" to={`/jobs/${encodeURIComponent(job.id)}`}>View role <ArrowRight size={14} /></Link></div>
    </article>
  )
}

function StatusMessage({ status, usingSample, retry }) {
  if (status === 'loading') return <div className="status-message"><span className="loading-spinner" />Looking for good work…</div>
  if (usingSample) return <div className="feed-notice"><span>Showing a curated sample while the live feed reconnects.</span><button type="button" onClick={retry}>Try again <ArrowRight size={14} /></button></div>
  return null
}

function ListingsPage({ savedOnly = false }) {
  const { jobs, status, usingSample, retry } = useJobs()
  const { savedIds } = useSavedJobs()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [place, setPlace] = useState('')
  const [page, setPage] = useState(1)
  const [mobileFilters, setMobileFilters] = useState(false)
  const matchedJobs = useMemo(() => jobs.filter((job) => {
    const text = `${job.title} ${job.company} ${job.tags.join(' ')}`.toLowerCase()
    const matchesSearch = !search || text.includes(search.toLowerCase())
    const matchesPlace = !place || `${job.location} ${job.remote ? 'remote' : ''}`.toLowerCase().includes(place.toLowerCase())
    const matchesCategory = !category || job.tags.some((tag) => tag.toLowerCase() === category.toLowerCase())
    const matchesType = !type || job.types.some((jobType) => jobType.toLowerCase() === type.toLowerCase())
    return matchesSearch && matchesPlace && matchesCategory && matchesType && (!savedOnly || savedIds.includes(job.id))
  }), [jobs, search, category, type, place, savedOnly, savedIds])
  const pageCount = Math.ceil(matchedJobs.length / PAGE_SIZE)
  const pageJobs = matchedJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function updateSearch(term, location) {
    setSearch(term.trim())
    setPlace(location.trim())
    setPage(1)
  }
  function clearFilters() {
    setSearch('')
    setCategory('')
    setType('')
    setPlace('')
    setPage(1)
  }

  return (
    <>
      {!savedOnly && <SearchHero onSearch={updateSearch} />}
      <main className={`results-section ${savedOnly ? 'saved-page' : ''}`} id="job-results">
        <div className="results-heading"><div><div className="eyebrow results-eyebrow">{savedOnly ? 'YOUR SHORTLIST' : 'THE GOOD STUFF'}</div><h2>{savedOnly ? 'Saved jobs' : 'Find your next thing.'}</h2><p>{savedOnly ? 'The roles you’ve tucked away for later.' : 'A few places doing work worth showing up for.'}</p></div><button type="button" className="mobile-filter-button" onClick={() => setMobileFilters(!mobileFilters)}><Filter size={16} /> Filters</button></div>
        <StatusMessage status={status} usingSample={usingSample} retry={retry} />
        <div className="results-layout">
          <div className={`filter-mobile-wrap ${mobileFilters ? 'open' : ''}`}><FilterPanel jobs={jobs} category={category} setCategory={setCategory} type={type} setType={setType} place={place} setPlace={setPlace} reset={clearFilters} resetPage={() => setPage(1)} /></div>
          <section className="job-results-column" aria-label="Job listings">
            <div className="list-toolbar"><div><strong>{matchedJobs.length}</strong> {matchedJobs.length === 1 ? 'role' : 'roles'} to explore</div><span>Sorted by newest</span></div>
            {status === 'loading' && jobs.length === 0 ? <div className="loading-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><span /><span /><span /></div>)}</div> : pageJobs.length ? <div className="job-grid">{pageJobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : <div className="empty-state"><span className="empty-icon"><Search size={22} /></span><h3>{savedOnly ? 'Your shortlist is waiting.' : 'No matches just yet.'}</h3><p>{savedOnly ? 'Save a role that catches your eye and it’ll live here.' : 'Try a different keyword or clear a filter to see more roles.'}</p>{!savedOnly && <button type="button" className="text-button" onClick={clearFilters}>Clear filters <ArrowRight size={15} /></button>}</div>}
            {pageCount > 1 && <nav className="pagination-row" aria-label="Job results pages"><span>Page {page} of {pageCount}</span><div><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ArrowLeft size={16} /></button><button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}><ArrowRight size={16} /></button></div></nav>}
          </section>
        </div>
      </main>
    </>
  )
}

function ApplicationDialog({ job, onClose }) {
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  useEffect(() => {
    function closeOnEscape(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function submitApplication(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const formData = new FormData(form)
    const application = { jobId: job.id, name: formData.get('name'), email: formData.get('email'), note: formData.get('note'), submittedAt: new Date().toISOString() }
    try {
      const applications = JSON.parse(localStorage.getItem('goodwork-applications') || '[]')
      localStorage.setItem('goodwork-applications', JSON.stringify([...applications, application]))
      setSubmitted(true)
      setFormError('')
    } catch {
      setFormError('Your application could not be saved in this browser. Please try again.')
    }
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="application-dialog" role="dialog" aria-modal="true" aria-labelledby="apply-title"><button className="dialog-close" type="button" onClick={onClose} aria-label="Close application"><X size={19} /></button>{submitted ? <div className="success-state"><span className="success-icon"><Check size={24} /></span><div className="eyebrow">APPLICATION SAVED</div><h2>You’re on your way.</h2><p>Your application for {job.title} at {job.company} has been saved in this browser.</p><button className="primary-button" type="button" onClick={onClose}>Done <ArrowRight size={16} /></button></div> : <><div className="eyebrow">MAKE YOUR MOVE</div><h2 id="apply-title">Apply for {job.title}</h2><p className="dialog-intro">A few details to get the conversation started with {job.company}.</p><form className="application-form" onSubmit={submitApplication}><label>Your name<input name="name" autoComplete="name" required minLength="2" placeholder="Jamie Taylor" /></label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="jamie@example.com" /></label><label>What should they know?<textarea name="note" required minLength="20" rows="4" placeholder="A little about why this role feels right…" /></label><p className="form-hint">Your details stay in this browser for this demo.</p>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="primary-button submit-application" type="submit">Send application <Send size={15} /></button></form></>}</section></div>
}

function JobDetailPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs, status } = useJobs()
  const { savedIds, toggleSaved } = useSavedJobs()
  const [showApplication, setShowApplication] = useState(false)
  const job = jobs.find((item) => item.id === jobId)
  if (status === 'loading') return <main className="detail-loading"><span className="loading-spinner" />Finding the role…</main>
  if (!job) return <main className="not-found"><div className="eyebrow">A SMALL DETOUR</div><h1>That role has moved on.</h1><p>It may have been filled, or the link may have changed.</p><Link className="primary-button" to="/">Back to the jobs <ArrowRight size={15} /></Link></main>

  return <main className="detail-page"><button className="back-link" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back to jobs</button><div className="detail-layout"><article className="detail-main"><div className="detail-company"><CompanyMark name={job.company} /><span>{job.company}</span></div><div className="eyebrow detail-eyebrow">{job.remote ? 'REMOTE FRIENDLY' : 'A GOOD OPPORTUNITY'}</div><h1>{job.title}</h1><div className="detail-meta"><span><MapPin size={16} />{job.location}</span>{job.types[0] && <span><BriefcaseBusiness size={16} />{job.types[0]}</span>}<span><Clock3 size={16} />Posted {formatDate(job.createdAt).toLowerCase()}</span></div><div className="detail-rule" /><section className="description-section"><h2>About the role</h2><p>{job.description}</p></section>{job.tags.length > 0 && <section className="description-section"><h2>What you’ll work with</h2><div className="detail-tags">{job.tags.map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div></section>}<div className="detail-bottom-actions"><button className="primary-button" type="button" onClick={() => setShowApplication(true)}>Apply for this role <ArrowUpRight size={16} /></button><button className={`save-detail-button ${savedIds.includes(job.id) ? 'is-saved' : ''}`} type="button" onClick={() => toggleSaved(job.id)}><Bookmark size={17} fill={savedIds.includes(job.id) ? 'currentColor' : 'none'} />{savedIds.includes(job.id) ? 'Saved' : 'Save for later'}</button></div></article><aside className="detail-aside"><div className="detail-aside-head"><span>THE QUICK TAKE</span><Sparkles size={18} /></div><div className="quick-item"><small>Company</small><strong>{job.company}</strong></div><div className="quick-item"><small>Where</small><strong>{job.location}</strong></div><div className="quick-item"><small>Work style</small><strong>{job.remote ? 'Remote friendly' : 'In person / hybrid'}</strong></div><div className="quick-item"><small>Listed</small><strong>{formatDate(job.createdAt)}</strong></div><div className="aside-note">Good things happen when the work feels right.</div>{job.url && <a className="original-listing" href={job.url} target="_blank" rel="noreferrer">Original listing <ArrowUpRight size={14} /></a>}</aside></div>{showApplication && <ApplicationDialog job={job} onClose={() => setShowApplication(false)} />}</main>
}

function Footer() {
  return <footer className="site-footer"><Link className="wordmark footer-wordmark" to="/"><span className="wordmark-icon"><Sparkles size={16} /></span>goodwork<span className="wordmark-period">.</span></Link><span>Good work is out there. Go find it.</span><a href="https://www.arbeitnow.com/" target="_blank" rel="noreferrer">Job data by Arbeitnow <ArrowUpRight size={13} /></a></footer>
}

function AppShell() {
  return <><Header /><Routes><Route path="/" element={<ListingsPage />} /><Route path="/saved" element={<ListingsPage savedOnly />} /><Route path="/jobs/:jobId" element={<JobDetailPage />} /><Route path="*" element={<main className="not-found"><div className="eyebrow">NOT FOUND</div><h1>Let’s find another way.</h1><Link className="primary-button" to="/">Go to jobs <ArrowRight size={15} /></Link></main>} /></Routes><Footer /></>
}

function App() {
  return <SavedJobsProvider><BrowserRouter><AppShell /></BrowserRouter></SavedJobsProvider>
}

export default App
