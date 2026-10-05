import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileText,
  FolderHeart,
  Gauge,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  NotebookText,
  PanelLeftClose,
  PanelLeftOpen,
  PencilRuler,
  Search,
  Settings,
  Sparkles,
  Star,
  SunMedium,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const demoUser = {
  name: 'Ava Thompson',
  email: 'demo@jobtrack.app',
  profile: {
    phone: '+1 (415) 738-2201',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/avathompson',
    portfolio: 'avathompson.dev',
    bio: 'Product-minded engineer with a strong track record in fast-moving SaaS teams and user-centered product delivery.',
  },
};

const initialJobs = [
  { id: 1, title: 'Senior Frontend Engineer', company: 'Northstar Labs', location: 'Remote', salary: '$135k - $160k', jobType: 'Full-time', status: 'Applied', applicationDate: '2026-09-01', deadline: '2026-09-18', url: 'https://example.com/jobs/1', notes: 'Strong fit with product and design systems.' },
  { id: 2, title: 'Product Analyst', company: 'SignalIQ', location: 'New York, NY', salary: '$110k - $130k', jobType: 'Hybrid', status: 'Interview', applicationDate: '2026-09-10', deadline: '2026-09-22', url: 'https://example.com/jobs/2', notes: 'Directly aligned with growth and experimentation work.' },
  { id: 3, title: 'UX Engineer', company: 'Aster Studio', location: 'Austin, TX', salary: '$120k - $145k', jobType: 'Full-time', status: 'Wishlist', applicationDate: '2026-09-12', deadline: '2026-09-24', url: 'https://example.com/jobs/3', notes: 'Need to review portfolio and team stack.' },
  { id: 4, title: 'Data Product Manager', company: 'NovaGrid', location: 'Chicago, IL', salary: '$140k - $170k', jobType: 'Remote', status: 'Offer', applicationDate: '2026-08-20', deadline: '2026-09-15', url: 'https://example.com/jobs/4', notes: 'Strong compensation package and leadership track.' },
];

const initialSavedJobs = [
  { id: 101, title: 'Senior Product Designer', company: 'Harbor Studio', location: 'Seattle, WA', salary: '$130k - $150k', jobType: 'On-site', posted: '2 days ago', applyLink: '#' },
  { id: 102, title: 'Frontend Engineer', company: 'Canvas Cloud', location: 'Remote', salary: '$120k - $140k', jobType: 'Full-time', posted: '5 days ago', applyLink: '#' },
  { id: 103, title: 'Customer Success Manager', company: 'Loop Metrics', location: 'Boston, MA', salary: '$95k - $115k', jobType: 'Hybrid', posted: '1 week ago', applyLink: '#' },
];

const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 9)}`;

const createExperienceItem = (overrides = {}) => ({
  id: generateId('exp'),
  company: '',
  position: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  bullets: [''],
  ...overrides,
});

const createEducationItem = (overrides = {}) => ({
  id: generateId('edu'),
  institution: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  gpa: '',
  location: '',
  ...overrides,
});

const createProjectItem = (overrides = {}) => ({
  id: generateId('proj'),
  name: '',
  description: '',
  technologies: '',
  url: '',
  ...overrides,
});

const defaultResume = {
  fullName: 'Ava Thompson',
  professionalTitle: 'Full Stack Engineer',
  email: 'demo@jobtrack.app',
  phone: '+1 (415) 738-2201',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/avathompson',
  github: 'github.com/avathompson',
  portfolio: 'avathompson.dev',
  summary: 'Product-minded Full Stack Engineer with a focus on performance, accessibility, and user-centered product delivery across SaaS products and internal tooling.',
  experience: [
    createExperienceItem({
      company: 'Northstar Labs',
      position: 'Senior Frontend Engineer',
      location: 'Remote',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      bullets: [
        'Built reusable React design system adopted by 8 product teams, improving UI consistency and accelerating delivery.',
        'Optimized front-end performance and accessibility, reducing page load time by 32% and improving usability for keyboard and screen-reader users.',
      ],
    }),
    createExperienceItem({
      company: 'LatticeWorks',
      position: 'Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2019',
      endDate: '2022',
      bullets: [
        'Improved onboarding conversion by 18% by shipping metrics-driven product improvements and streamlined user journeys.',
      ],
    }),
  ],
  education: [
    createEducationItem({
      institution: 'University of California, Berkeley',
      degree: 'B.S.',
      fieldOfStudy: 'Computer Science',
      startDate: '2015',
      endDate: '2019',
      gpa: '3.8',
    }),
  ],
  skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'SQL', 'UX Research', 'Accessibility'],
  projects: [
    createProjectItem({
      name: 'Career AI dashboard',
      description: 'Built an internal analytics dashboard that surfaced hiring trends and candidate readiness for 250+ users.',
      technologies: 'React, Node.js, PostgreSQL',
      url: 'https://example.com/projects/career-ai',
    }),
  ],
  certifications: ['AWS Certified Cloud Practitioner'],
  achievements: ['Led design system migration for 3 core products', 'Reduced manual screening time by 34%'],
  languages: ['English', 'Spanish'],
  template: 'Modern',
};

const normalizeResumeData = (resume) => {
  const base = JSON.parse(JSON.stringify(defaultResume));
  const source = resume && typeof resume === 'object' ? resume : {};

  const normalizeBullets = (items) => {
    if (!Array.isArray(items)) return [''];
    return items.map((item) => String(item || '')).filter((item) => item.trim().length > 0).slice(0, 8) || [''];
  };

  const normalizeExperience = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [createExperienceItem()];
    }

    return items.map((item) => {
      if (!item || typeof item !== 'object') {
        return createExperienceItem({ bullets: normalizeBullets([String(item || '')]) });
      }

      return {
        ...createExperienceItem(),
        ...item,
        bullets: normalizeBullets(item.bullets),
      };
    });
  };

  const normalizeEducation = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [createEducationItem()];
    }

    return items.map((item) => ({
      ...createEducationItem(),
      ...(item && typeof item === 'object' ? item : {}),
    }));
  };

  const normalizeProjects = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [createProjectItem()];
    }

    return items.map((item) => ({
      ...createProjectItem(),
      ...(item && typeof item === 'object' ? item : {}),
    }));
  };

  return {
    ...base,
    ...source,
    template: ['Modern', 'Professional', 'Minimal'].includes(source.template) ? source.template : 'Modern',
    fullName: String(source.fullName ?? base.fullName ?? '').trim(),
    professionalTitle: String(source.professionalTitle ?? base.professionalTitle ?? '').trim(),
    email: String(source.email ?? base.email ?? '').trim(),
    phone: String(source.phone ?? base.phone ?? '').trim(),
    location: String(source.location ?? base.location ?? '').trim(),
    linkedin: String(source.linkedin ?? base.linkedin ?? '').trim(),
    github: String(source.github ?? base.github ?? '').trim(),
    portfolio: String(source.portfolio ?? base.portfolio ?? '').trim(),
    summary: String(source.summary ?? base.summary ?? '').trim(),
    skills: Array.isArray(source.skills) ? source.skills.filter((skill) => typeof skill === 'string' && skill.trim()).map((skill) => skill.trim()) : Array.isArray(base.skills) ? base.skills : [],
    certifications: Array.isArray(source.certifications) ? source.certifications.filter((item) => typeof item === 'string').map((item) => item.trim()) : Array.isArray(base.certifications) ? base.certifications : [],
    achievements: Array.isArray(source.achievements) ? source.achievements.filter((item) => typeof item === 'string').map((item) => item.trim()) : Array.isArray(base.achievements) ? base.achievements : [],
    languages: Array.isArray(source.languages) ? source.languages.filter((item) => typeof item === 'string').map((item) => item.trim()) : Array.isArray(base.languages) ? base.languages : [],
    experience: normalizeExperience(source.experience),
    education: normalizeEducation(source.education),
    projects: normalizeProjects(source.projects),
  };
};

const interviewQuestions = [
  { id: 1, category: 'HR Interview', difficulty: 'Easy', question: 'Tell me about yourself.', answer: 'I combine product thinking with engineering execution, and I enjoy turning customer pain points into clear technical solutions.' },
  { id: 2, category: 'Behavioral', difficulty: 'Medium', question: 'Describe a time you resolved a conflict within a team.', answer: 'I focused on outcomes by clarifying responsibilities, aligning on the shared goal, and documenting the decision path.' },
  { id: 3, category: 'Technical', difficulty: 'Hard', question: 'How do you improve React application performance?', answer: 'I reduce unnecessary rerenders, use memoization where appropriate, split large bundles, and profile real user flows before optimizing.' },
  { id: 4, category: 'Situational', difficulty: 'Medium', question: 'How do you prioritize work when multiple deadlines are moving?', answer: 'I assess urgency, business value, and dependencies, then communicate trade-offs early and keep execution measurable.' },
];

const aptitudeQuestions = [
  { id: 1, category: 'Quantitative Aptitude', question: 'If 18 is 30% of a number, what is the number?', options: ['50', '60', '70', '80'], answer: '60', explanation: '18 = 0.3 × x, so x = 18 ÷ 0.3 = 60.' },
  { id: 2, category: 'Logical Reasoning', question: 'Choose the next number: 3, 6, 12, 24, ?', options: ['36', '42', '48', '60'], answer: '48', explanation: 'Each number doubles, so 24 × 2 = 48.' },
  { id: 3, category: 'Verbal Ability', question: 'Choose the synonym of “meticulous.”', options: ['Casual', 'Careful', 'Hasty', 'Silent'], answer: 'Careful', explanation: 'Meticulous means showing great attention to detail.' },
  { id: 4, category: 'Data Interpretation', question: 'If a product gets 120 leads and converts 20%, how many customers result?', options: ['18', '20', '24', '30'], answer: '24', explanation: '20% of 120 = 24.' },
];

const technicalTopics = [
  { id: 'react', title: 'React', concepts: ['Components', 'Hooks', 'State', 'Props'], questions: ['What is the virtual DOM?', 'How do hooks help in component logic?'], examples: ['UseMemo and conditional rendering examples'], interviewQuestions: ['Explain reconciliation in React.'] },
  { id: 'node', title: 'Node.js', concepts: ['Event loop', 'Async I/O', 'Express', 'Streams'], questions: ['How does Node handle concurrency?', 'What is middleware in Express?'], examples: ['Create a simple API route'], interviewQuestions: ['Explain the difference between blocking and non-blocking code.'] },
  { id: 'javascript', title: 'JavaScript', concepts: ['Closures', 'Promises', 'Arrays', 'Objects'], questions: ['What is closure?', 'How do promises improve async code?'], examples: ['Use map, filter, reduce'], interviewQuestions: ['Explain hoisting and scope'] },
];

const featureCards = [
  { title: 'Job Tracker', description: 'Organize every opportunity from wishlist to offer in one place.', icon: BriefcaseBusiness },
  { title: 'Resume Builder', description: 'Create, edit, and export ATS-friendly resumes in seconds.', icon: FileText },
  { title: 'AI Enhancement', description: 'Generate tailored summaries, skills, and keywords for each role.', icon: Sparkles },
  { title: 'ATS Checker', description: 'Spot missing skills and formatting issues before you apply.', icon: Gauge },
  { title: 'Interview Prep', description: 'Practice HR, technical, and behavioral interview questions.', icon: MessageSquareText },
  { title: 'Career Guidance', description: 'Build a roadmap with skill gaps and interview-ready advice.', icon: TrendingUp },
];

const testimonials = [
  { name: 'Riya Patel', role: 'Product Designer', text: 'JobTrack helped me keep my applications organized and gave me confidence before every interview.' },
  { name: 'Marcus Lee', role: 'Software Engineer', text: 'The ATS checker and resume suggestions were the difference between a generic resume and a strong application.' },
  { name: 'Nina Gomez', role: 'Marketing Analyst', text: 'I used the dashboard to improve my job search cadence and landed the right role sooner than expected.' },
];

const faqs = [
  { question: 'Can I use JobTrack without a database?', answer: 'Yes. The app includes a demo mode that works without MongoDB or external AI services.' },
  { question: 'Does the platform support ATS-friendly resumes?', answer: 'Yes. The resume builder and ATS checker are designed to highlight structure and keyword gaps.' },
  { question: 'Can I access the dashboard from mobile?', answer: 'Yes. The layout is responsive and collapses into a mobile-friendly navigation menu.' },
];

const statusColors = { Applied: '#4f46e5', Interview: '#7c3aed', Offer: '#10b981', Rejected: '#ef4444', Wishlist: '#f59e0b' };

function clearJobTrackAuthSession() {
  localStorage.removeItem('jobtrack-auth');
  localStorage.removeItem('jobtrackToken');
  localStorage.removeItem('jobtrackUser');
}

function getStoredAuth() {
  try {
    const stored = localStorage.getItem('jobtrack-auth');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredJobs() {
  try {
    const stored = localStorage.getItem('jobtrack-jobs');
    return stored ? JSON.parse(stored) : initialJobs;
  } catch {
    return initialJobs;
  }
}

function getStoredResume() {
  try {
    const stored = localStorage.getItem('jobtrack-resume');
    return stored ? normalizeResumeData(JSON.parse(stored)) : normalizeResumeData(defaultResume);
  } catch {
    return normalizeResumeData(defaultResume);
  }
}

function getStoredBookmarks() {
  try {
    const stored = localStorage.getItem('jobtrack-bookmarks');
    return stored ? JSON.parse(stored) : initialSavedJobs.map((job) => ({ ...job, type: 'job' }));
  } catch {
    return initialSavedJobs.map((job) => ({ ...job, type: 'job' }));
  }
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Layout({ auth, onLogout, children, sidebarOpen, setSidebarOpen, theme, setTheme }) {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Jobs', path: '/jobs', icon: BriefcaseBusiness },
    { label: 'Recommendations', path: '/recommendations', icon: Sparkles },
    { label: 'Job Comparison', path: '/job-comparison', icon: BarChart3 },
    { label: 'Job Alerts', path: '/job-alerts', icon: CircleDashed },
    { label: 'Applications', path: '/saved-jobs', icon: FolderHeart },
    { label: 'Resume', path: '/resume', icon: FileText },
    { label: 'Resume Match', path: '/resume-match', icon: BarChart3 },
    { label: 'ATS', path: '/ats', icon: Gauge },
    { label: 'Cover Letter', path: '/cover-letter', icon: FileText },
    { label: 'Email Generator', path: '/email-generator', icon: NotebookText },
    { label: 'Skill Gap', path: '/skill-gap', icon: Gauge },
    { label: 'Career Roadmap', path: '/career-roadmap', icon: TrendingUp },
    { label: 'Learning Hub', path: '/learning-hub', icon: GraduationCap },
    { label: 'Career Goals', path: '/career-goals', icon: CheckCircle2 },
    { label: 'Interview Simulator', path: '/interview-simulator', icon: MessageSquareText },
    { label: 'Interview Calendar', path: '/interview-calendar', icon: CalendarDays },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Application Timeline', path: '/analytics?view=timeline', icon: CalendarDays },
    { label: 'Salary Insights', path: '/salary-insights', icon: TrendingUp },
    { label: 'Certifications', path: '/certifications', icon: GraduationCap },
    { label: 'Portfolio', path: '/portfolio', icon: BriefcaseBusiness },
    { label: 'Public Profile', path: auth?.user?.id ? `/profile/${auth.user.id}` : '/profile/public', icon: User },
    { label: 'AI Career Assistant', path: '/career-assistant', icon: Sparkles },
    { label: 'Notifications', path: '/notifications', icon: CircleDashed },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="brand-row">
          <div className="brand-badge">J</div>
          <div>
            <h2>JobTrack</h2>
          </div>
          <button className="menu-toggle desktop-hidden" onClick={() => setSidebarOpen((value) => !value)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-user-card">
            <div className="avatar-circle">{auth?.user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'JT'}</div>
            <div>
              <strong>{auth?.user?.name || 'Guest'}</strong>
              <span>{auth?.user?.email || 'guest@jobtrack.app'}</span>
            </div>
          </div>
          <button className="action-link danger" onClick={onLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle mobile-hidden" onClick={() => setSidebarOpen((value) => !value)}>
              {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
            </button>
            <div>
              <p className="eyebrow">{location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}</p>
              <h1>{auth?.user?.name ? `Welcome back, ${auth.user.name.split(' ')[0]}` : 'Welcome'}</h1>
            </div>
          </div>
          <div className="topbar-right">
            <button className="icon-button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={18} /> : <SunMedium size={18} />}
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

const publicNavItems = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/resume-ai', label: 'Resume AI' },
  { to: '/career-resources', label: 'Career Resources' },
  { to: '/about', label: 'About' },
];

function PublicHeader() {
  return (
    <header className="landing-header">
      <div className="container nav-shell">
        <Link to="/" className="brand">
          <span className="brand-badge">J</span>
          <span>JobTrack</span>
        </Link>

        <nav className="landing-nav">
          {publicNavItems.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `landing-nav-link ${isActive ? 'active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="secondary-btn">Login</Link>
          <Link to="/signup" className="primary-btn">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <PublicHeader />

      <main>
        <section id="home" className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="chip">AI-powered career platform</p>
              <h1>Your Complete Job Search & Career Companion</h1>
              <p className="hero-subtitle">Track applications, improve ATS-readiness, prepare for interviews, and manage every step of your career plan with one intelligent platform.</p>
              <div className="hero-actions">
                <Link to="/signup" className="primary-btn">Get Started</Link>
                <Link to="/jobs" className="secondary-btn">Explore Jobs</Link>
              </div>
              <div className="mini-stats">
                <div><strong>24k+</strong><span>Applications tracked</span></div>
                <div><strong>93%</strong><span>Resume quality boost</span></div>
                <div><strong>4.9/5</strong><span>User rating</span></div>
              </div>
            </div>
            <div className="dashboard-preview">
              <div className="preview-window">
                <div className="preview-topbar">
                  <span></span><span></span><span></span>
                </div>
                <div className="preview-content">
                  <div className="stat-blocks">
                    <div className="mini-card">
                      <span>Total Applications</span>
                      <strong>128</strong>
                    </div>
                    <div className="mini-card accent">
                      <span>Interviews</span>
                      <strong>24</strong>
                    </div>
                  </div>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={[{ name: 'Jan', value: 50 }, { name: 'Feb', value: 60 }, { name: 'Mar', value: 75 }, { name: 'Apr', value: 85 }, { name: 'May', value: 65 }]}> 
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="list-box">
                    <div className="list-item"><span>Senior Product Analyst</span><strong>Interview</strong></div>
                    <div className="list-item"><span>Frontend Engineer</span><strong>Applied</strong></div>
                    <div className="list-item"><span>Data PM</span><strong>Offer</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-block">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Features</p>
              <h2>Everything you need to move faster in your job search</h2>
            </div>
            <div className="feature-grid">
              {featureCards.map(({ title, description, icon: Icon }) => (
                <div key={title} className="feature-card">
                  <div className="icon-wrap"><Icon size={20} /></div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block alt-bg">
          <div className="container steps-grid">
            <div className="section-heading left">
              <p className="eyebrow">How it works</p>
              <h2>Go from searching to interviews with a smarter system</h2>
            </div>
            <div className="steps-card">
              <div className="step"><span>1</span><div><h3>Build your profile</h3><p>Set up your resume, profile, and job preferences.</p></div></div>
              <div className="step"><span>2</span><div><h3>Track opportunities</h3><p>Move jobs through the pipeline with statuses and notes.</p></div></div>
              <div className="step"><span>3</span><div><h3>Prepare confidently</h3><p>Use ATS feedback, interview questions, and skill checks to improve.</p></div></div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="container stats-grid">
            <div className="metric-card">
              <strong>120k+</strong>
              <span>Job applications managed</span>
            </div>
            <div className="metric-card">
              <strong>86%</strong>
              <span>Higher interview rates</span>
            </div>
            <div className="metric-card">
              <strong>18 hrs</strong>
              <span>Saved per month</span>
            </div>
            <div className="metric-card">
              <strong>4.9/5</strong>
              <span>User satisfaction</span>
            </div>
          </div>
        </section>

        <section className="section-block alt-bg">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Testimonials</p>
              <h2>Built for people who want a smarter career plan</h2>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((user) => (
                <div key={user.name} className="testimonial-card">
                  <div className="stars"><Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /></div>
                  <p>“{user.text}”</p>
                  <strong>{user.name}</strong>
                  <span>{user.role}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="resume-ai" className="section-block alt-bg">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Resume AI</p>
              <h2>Smart resume support that turns your experience into better applications</h2>
            </div>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="icon-wrap"><Sparkles size={20} /></div>
                <h3>AI summary upgrades</h3>
                <p>Rewrite your professional summary to sound sharper, clearer, and tailored to the role.</p>
              </div>
              <div className="feature-card">
                <div className="icon-wrap"><Gauge size={20} /></div>
                <h3>Keyword alignment</h3>
                <p>Match your resume to hiring language and spot missing terms before you submit.</p>
              </div>
              <div className="feature-card">
                <div className="icon-wrap"><CheckCircle2 size={20} /></div>
                <h3>ATS-ready output</h3>
                <p>Improve clarity, structure, and formatting so recruiters can scan your profile quickly.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="career" className="section-block">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Career Resources</p>
              <h2>Guidance that helps you move from search to interview with confidence</h2>
            </div>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="icon-wrap"><TrendingUp size={20} /></div>
                <h3>Career roadmap</h3>
                <p>Follow a step-by-step path for upskilling, networking, and applying strategically.</p>
              </div>
              <div className="feature-card">
                <div className="icon-wrap"><NotebookText size={20} /></div>
                <h3>Interview prep</h3>
                <p>Practice behavioral, technical, and HR questions with confident, structured answers.</p>
              </div>
              <div className="feature-card">
                <div className="icon-wrap"><Search size={20} /></div>
                <h3>Job search tips</h3>
                <p>Use tailored messaging, metrics, and role-fit insights to improve response rates.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="section-block cta-block">
          <div className="container cta-box">
            <div>
              <p className="eyebrow">Take control</p>
              <h2>Start your next opportunity with confidence.</h2>
            </div>
            <Link to="/signup" className="primary-btn">Launch your job search</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container footer-shell">
          <div>
            <div className="brand"><span className="brand-badge">J</span><span>JobTrack</span></div>
            <p>Career guidance and job search tools built to help you move faster.</p>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#resume-ai">Resume AI</a>
            <a href="#career">Career Resources</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PublicPageShell({ eyebrow, title, description, actions, children }) {
  return (
    <div className="landing-page public-page">
      <PublicHeader />
      <main className="public-page-main">
        <section className="section-block alt-bg">
          <div className="container public-hero">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {description && <p className="public-page-description">{description}</p>}
            {actions && <div className="hero-actions">{actions}</div>}
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}

function FeaturesPage() {
  const features = [
    { title: 'Job Tracker', description: 'Track applications, organize interviews, and keep every opportunity moving.', path: '/jobs', icon: BriefcaseBusiness },
    { title: 'Resume Builder', description: 'Create polished resumes, save versions, and export professional PDFs.', path: '/resume', icon: FileText },
    { title: 'ATS Checker', description: 'Review resume match quality and improve keyword coverage before applying.', path: '/ats', icon: Gauge },
    { title: 'Resume AI', description: 'Use AI guidance for stronger summaries, keywords, and role-tailored language.', path: '/resume-ai', icon: Sparkles },
    { title: 'Interview Prep', description: 'Practice HR, behavioral, and technical questions with confidence.', path: '/interview', icon: MessageSquareText },
    { title: 'Career Guidance', description: 'Plan your next move with actionable, role-specific career support.', path: '/career', icon: TrendingUp },
    { title: 'Saved Jobs', description: 'Keep the jobs you want to revisit without losing track of your pipeline.', path: '/saved-jobs', icon: FolderHeart },
    { title: 'Profile & Settings', description: 'Manage your account profile, preferences, and security details in one place.', path: '/settings', icon: Settings },
  ];

  return (
    <PublicPageShell
      eyebrow="Features"
      title="A complete toolkit for every step of your job search"
      description="JobTrack brings your applications, resume work, interview prep, and career planning together in one streamlined system."
      actions={[
        <Link key="signup" to="/signup" className="primary-btn">Get started</Link>,
        <Link key="jobs" to="/jobs" className="secondary-btn">Open dashboard</Link>,
      ]}
    >
      <section className="section-block">
        <div className="container">
          <div className="feature-grid">
            {features.map(({ title, description, path, icon: Icon }) => (
              <div key={title} className="feature-card">
                <div className="icon-wrap"><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link to={path} className="secondary-btn small-btn">Open</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

function ResumeAIPage() {
  const [form, setForm] = useState({
    content: defaultResume.summary,
    jobTitle: 'Senior Product Designer',
    jobDescription: 'Seeking a product designer with strong UX, prototyping, accessibility, and cross-functional collaboration.',
  });
  const [result, setResult] = useState('');
  const [keywords, setKeywords] = useState(['UX', 'Accessibility', 'Design systems', 'User research', 'Prototyping']);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const enhanceResume = () => {
    const content = form.content.trim();
    if (!content) {
      setStatus('Please add resume text before generating suggestions.');
      return;
    }

    setIsLoading(true);
    setStatus('');

    window.setTimeout(() => {
      const terms = ['Accessibility', 'Design systems', 'User research', form.jobTitle || 'Role fit'];
      const enhanced = `Product-focused professional with 5+ years of experience creating approachable, high-impact experiences and measurable business outcomes. Skilled in ${form.jobTitle}, user-centered design, collaboration, and systems thinking across complex product environments.`;

      setResult(enhanced);
      setKeywords(Array.from(new Set(terms.filter(Boolean))));
      setStatus('Resume suggestions generated locally because the external AI service is not configured in this environment.');
      setIsLoading(false);
    }, 500);
  };

  const cards = [
    { title: 'Resume improvement', description: 'Refine your summary, impact language, and structure with clearer, recruiter-friendly phrasing.' },
    { title: 'ATS optimization', description: 'Improve keyword coverage, role alignment, and readability for ATS screening.' },
    { title: 'Job description analysis', description: 'Compare your resume against the target role and catch missing skills earlier.' },
    { title: 'Resume suggestions', description: 'Get tailored recommendations for stronger bullet points and positioning.' },
    { title: 'Skills suggestions', description: 'See which tools, frameworks, and capabilities you should highlight more often.' },
    { title: 'Keyword suggestions', description: 'Use language that matches the role while staying authentic and current.' },
  ];

  return (
    <PublicPageShell
      eyebrow="Resume AI"
      title="Smart resume guidance that helps you stand out"
      description="Use JobTrack’s AI-driven suggestions to strengthen your resume and align it with the roles you want."
      actions={[
        <Link key="resume" to="/resume" className="primary-btn">Build resume</Link>,
        <Link key="ats" to="/ats" className="secondary-btn">Check ATS</Link>,
      ]}
    >
      <section className="section-block">
        <div className="container">
          <div className="ai-layout">
            <div className="ai-form">
              <textarea rows="8" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Paste a resume bullet or summary" />
              <div className="form-grid two-cols">
                <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Target job title" />
                <input value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} placeholder="Target job description" />
              </div>
              <button className="primary-btn" onClick={enhanceResume} disabled={isLoading}>{isLoading ? 'Generating...' : 'Enhance Resume'}</button>
              {status && <div className="error-box" style={{ marginTop: '12px' }}>{status}</div>}
            </div>
            <div className="ai-result">
              <div className="result-block">
                <h4>AI Improved Content</h4>
                <p>{result || 'Your enhanced summary will appear here.'}</p>
              </div>
              <div className="result-block">
                <h4>Suggested Keywords</h4>
                <div className="tag-group">{keywords.map((item) => <span key={item} className="tag">{item}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container feature-grid">
          {cards.map(({ title, description }) => (
            <div key={title} className="feature-card">
              <div className="icon-wrap"><Sparkles size={20} /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}

function CareerResourcesPage() {
  const resourceCards = [
    { title: 'Resume tips', description: 'Learn how to structure impact statements and optimize your experience for recruiters.' },
    { title: 'Interview tips', description: 'Prepare stronger answers for behavioral, technical, and leadership questions.' },
    { title: 'Job search strategy', description: 'Build a repeatable system for outreach, follow-ups, and application tracking.' },
    { title: 'LinkedIn tips', description: 'Improve your profile, headline, and networking message to attract better-fit roles.' },
    { title: 'Networking', description: 'Turn outreach into conversations with a clear and professional approach.' },
    { title: 'Salary negotiation', description: 'Position your value, understand range, and negotiate more confidently.' },
    { title: 'Career planning', description: 'Map your next role and skill moves with a realistic growth plan.' },
    { title: 'Skill development', description: 'Focus on learning areas that increase your market value and confidence.' },
    { title: 'ATS guidance', description: 'Apply formatting and keyword strategies that improve resume visibility.' },
  ];

  return (
    <PublicPageShell
      eyebrow="Career Resources"
      title="Actionable guidance for stronger applications and better career decisions"
      description="Explore practical strategies that help you improve your resume, interview readiness, networking, and long-term career growth."
      actions={[
        <Link key="jobs" to="/jobs" className="primary-btn">Track applications</Link>,
        <Link key="interview" to="/interview" className="secondary-btn">Practice interview</Link>,
      ]}
    >
      <section className="section-block">
        <div className="container feature-grid">
          {resourceCards.map(({ title, description }) => (
            <div key={title} className="feature-card">
              <div className="icon-wrap"><NotebookText size={20} /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}

function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About"
      title="JobTrack is built for ambitious job seekers who want clarity and momentum"
      description="We help people manage applications, sharpen their resume, prepare for interviews, and stay organized throughout the full job search journey."
      actions={[
        <Link key="signup" to="/signup" className="primary-btn">Get started</Link>,
        <Link key="features" to="/features" className="secondary-btn">Explore features</Link>,
      ]}
    >
      <section className="section-block">
        <div className="container about-grid">
          <div className="feature-card">
            <h3>What JobTrack is</h3>
            <p>A modern career platform that combines job tracking, resume work, ATS feedback, interview preparation, and personalized guidance in one place.</p>
          </div>
          <div className="feature-card">
            <h3>Mission</h3>
            <p>To make the job search process more structured, less stressful, and more effective for professionals at every stage of their career.</p>
          </div>
          <div className="feature-card">
            <h3>How it helps</h3>
            <p>JobTrack helps users stay organized, improve application quality, and build confidence before interviews and offers.</p>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

function AuthPage({ type, onSubmit, buttonText, isSubmitting }) {
  const [form, setForm] = useState(type === 'login' ? { email: '', password: '' } : { name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    onSubmit(form, setError);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand"><span className="brand-badge">J</span><span>JobTrack</span></div>
          <h2>{type === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{type === 'login' ? 'Sign in to continue managing your career.' : 'Start your smarter job search journey.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {type === 'signup' && (
            <label>
              <span>Full name</span>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Alex Morgan" required />
            </label>
          )}

          <label>
            <span>Email</span>
            <input type="email" name="email" value={form.email || ''} onChange={handleChange} placeholder="you@example.com" required />
          </label>

          <label>
            <span>Password</span>
            <div className="password-input">
              <input type={showPassword ? 'text' : 'password'} name="password" value={form.password || ''} onChange={handleChange} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>

          {type === 'signup' && (
            <>
              <label>
                <span>Confirm password</span>
                <div className="password-input">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword || ''} onChange={handleChange} placeholder="Re-enter password" required />
                  <button type="button" onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? 'Hide' : 'Show'}</button>
                </div>
              </label>

              <div className="strength-bar">
                <span className={form.password?.length >= 8 ? 'filled' : ''}></span>
                <span className={form.password?.length >= 12 ? 'filled' : ''}></span>
                <span className={form.password?.length >= 14 ? 'filled' : ''}></span>
              </div>
            </>
          )}

          {type === 'login' && (
            <div className="auth-utility-row">
              <label className="checkbox-label"><input type="checkbox" defaultChecked /> Remember me</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}

          {type === 'signup' && (
            <label className="checkbox-label terms"><input type="checkbox" required /> I agree to the terms and conditions</label>
          )}

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="primary-btn full-width" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : buttonText}
          </button>
        </form>

        <div className="auth-switch">
          {type === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
          <Link to={type === 'login' ? '/signup' : '/login'}>{type === 'login' ? 'Sign up' : 'Login'}</Link>
        </div>
      </div>
    </div>
  );
}

function EmailVerificationPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const location = useLocation();
  const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';
  const sentState = new URLSearchParams(location.search).get('sent');

  useEffect(() => {
    if (sentState === '1') {
      setStatus('Verification code sent to your email.');
    } else if (sentState === '0') {
      setStatus("We couldn't send the verification email. Please try again.");
    }
  }, [sentState]);

  const handleChange = (index, value) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, '').slice(0, 1);
    setCode(next);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      const previousInput = document.getElementById(`otp-${index - 1}`);
      if (previousInput) previousInput.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const next = Array.from({ length: 6 }, (_, index) => pasted[index] || '');
    setCode(next);
  };

  const submitCode = async () => {
    const joined = code.join('');
    if (joined.length !== 6) {
      setStatus('Please enter the full 6-digit code.');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const response = await fetch('http://localhost:5001/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: joined }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Verification failed.');

      const nextAuth = { user: data.user, token: data.token };
      localStorage.setItem('jobtrack-auth', JSON.stringify(nextAuth));
      window.location.href = '/dashboard';
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    if (isResending || !email) return;
    setIsResending(true);
    setStatus('');
    try {
      const response = await fetch('http://localhost:5001/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to resend code.');
      setCode(Array(6).fill(''));
      setStatus(data.message || 'Verification code sent to your email.');
      const firstInput = document.getElementById('otp-0');
      if (firstInput) firstInput.focus();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand"><span className="brand-badge">J</span><span>JobTrack</span></div>
          <h2>Verify your email</h2>
          <p>Enter the 6-digit verification code we sent to {email || 'your email'}.</p>
        </div>
        <div className="otp-grid" onPaste={handlePaste}>
          {code.map((value, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              value={value}
              maxLength={1}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className="otp-input"
              aria-label={`Verification code box ${index + 1}`}
            />
          ))}
        </div>
        {status && <div className="error-box">{status}</div>}
        <button className="primary-btn full-width" onClick={submitCode} disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>
        <div className="auth-switch">
          <button className="text-button" onClick={resendCode} disabled={isResending}>
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const response = await fetch('http://localhost:5001/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to process request.');

      setStatus(data.message || 'If an account exists for this email, a password reset link has been sent.');
    } catch (error) {
      setStatus(error.message || 'Unable to connect to the JobTrack server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand"><span className="brand-badge">J</span><span>JobTrack</span></div>
          <h2>Reset your password</h2>
          <p>Enter your registered email to receive a reset link.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {status && <div className="error-box">{status}</div>}
          <button className="primary-btn full-width" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send reset link'}</button>
        </form>
        <div className="auth-switch"><Link to="/login">Back to login</Link></div>
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = location.pathname.split('/').filter(Boolean).slice(1).join('/') || params.get('token') || '';

  const submit = async (event) => {
    event.preventDefault();

    if (!token) {
      setStatus('This password reset link is invalid.');
      return;
    }

    if (password.length < 6) {
      setStatus('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const response = await fetch('http://localhost:5001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password, confirmPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to reset password.');

      setStatus(data.message || 'Your password has been reset successfully. You can now log in.');
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (error) {
      setStatus(error.message || 'This password reset link is invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand"><span className="brand-badge">J</span><span>JobTrack</span></div>
          <h2>Create a new password</h2>
          <p>Choose a strong password for your account.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>New password</span>
            <div className="password-input">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <label>
            <span>Confirm password</span>
            <div className="password-input">
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <div className="strength-bar">
            <span className={password.length >= 8 ? 'filled' : ''}></span>
            <span className={password.length >= 12 ? 'filled' : ''}></span>
            <span className={password.length >= 14 ? 'filled' : ''}></span>
          </div>
          {status && <div className="error-box">{status}</div>}
          <button className="primary-btn full-width" disabled={isLoading}>{isLoading ? 'Updating...' : 'Update password'}</button>
        </form>
        <div className="auth-switch"><Link to="/login">Back to login</Link></div>
      </div>
    </div>
  );
}

function VerificationSuccessPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand"><span className="brand-badge">J</span><span>JobTrack</span></div>
          <h2>Email verified</h2>
          <p>Your account has been verified successfully. You can now continue to your dashboard.</p>
        </div>
        <Link to="/dashboard" className="primary-btn full-width">Go to dashboard</Link>
      </div>
    </div>
  );
}

function DashboardPage({ auth, jobs, bookmarks, theme, handleLogout }) {
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState('90d');
  const [statusFilter, setStatusFilter] = useState('All');
  const [error, setError] = useState('');
  const loadSummary = async () => {
    try {
      const query = new URLSearchParams({ range, status: statusFilter });
      const response = await fetch(`http://localhost:5001/api/dashboard/summary?${query}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load dashboard data.');
      setSummary(data.data);
    } catch (loadError) { setError(loadError.message); }
  };
  useEffect(() => { loadSummary(); }, [auth?.token, range, statusFilter]);
  if (error && !summary) return <div className="page-section"><div className="panel-card error-box" role="alert">{error}</div></div>;
  if (!summary) return <div className="page-section"><div className="panel-card empty-state">Loading your career dashboard...</div></div>;
  const chartData = Object.entries(summary.statusCounts || {}).map(([name, value]) => ({ name, value }));
  const stats = [
    { label: 'Total Applications', value: summary.kpis.totalApplications, icon: BriefcaseBusiness, path: '/jobs' },
    { label: 'Active Applications', value: summary.kpis.activeApplications, icon: TrendingUp, path: '/jobs' },
    { label: 'Interviews', value: summary.kpis.interviews, icon: MessageSquareText, path: '/interview' },
    { label: 'Offers', value: summary.kpis.offers, icon: CheckCircle2, path: '/jobs' },
    { label: 'Saved Jobs', value: summary.kpis.savedJobs, icon: FolderHeart, path: '/saved-jobs' },
    { label: 'Resume ATS Score', value: summary.kpis.atsScore === null ? 'Unavailable' : `${summary.kpis.atsScore}/100`, icon: Gauge, path: '/ats' },
    { label: 'Recommended Jobs', value: summary.recentApplications.length, icon: Sparkles, path: '/recommendations' },
    { label: 'Skill Match', value: `${summary.readiness.profileCompletion || 0}%`, icon: BarChart3, path: '/skill-gap' },
    { label: 'Application Analytics', value: summary.kpis.totalApplications, icon: BarChart3, path: '/analytics' },
    { label: 'Upcoming Deadlines', value: summary.deadlineReminders?.length || 0, icon: CalendarDays, path: '/analytics' },
    { label: 'Career Roadmap', value: `${summary.readiness.roadmapCompletion || 0}%`, icon: TrendingUp, path: '/career-roadmap' },
    { label: 'Interview Progress', value: summary.readiness.interviewPracticeSessions, icon: MessageSquareText, path: '/interview-simulator' },
    { label: 'Profile Completion', value: `${summary.readiness.profileCompletion || 0}%`, icon: User, path: '/profile' },
    { label: 'Career Readiness', value: `${summary.readiness.careerReadiness || 0}%`, icon: GraduationCap, path: '/career-roadmap' },
  ];
  const profileCompletion = summary.readiness.profileCompletion || 0;
  return <div className="page-section dashboard-page">
    <div className="dashboard-heading"><div><p className="eyebrow">CAREER INTELLIGENCE</p><h2>{summary.greeting}</h2><p className="panel-subtitle">Your career activity at a glance. Values reflect your saved JobTrack data.</p></div><div className="dashboard-filters"><label className="field-label"><span>Date range</span><select value={range} onChange={(event) => setRange(event.target.value)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 3 months</option><option value="180d">Last 6 months</option></select></label><label className="field-label"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{Object.keys(summary.statusCounts || {}).map((status) => <option key={status}>{status}</option>)}</select></label></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="stats-grid dashboard-grid">{stats.map(({ label, value, icon: Icon, path }) => <Link to={path} key={label} className="metric-card dashboard-card dashboard-kpi"><div className="metric-icon"><Icon size={18} /></div><div><span>{label}</span><strong>{value}</strong></div></Link>)}</div>
    <div className="charts-grid"><div className="panel-card large-panel"><div className="panel-heading"><h3>Profile completion</h3></div><div className="progress-card"><div className="progress-label"><span>Current profile</span><strong>{profileCompletion}%</strong></div><div className="progress-track"><span style={{ width: `${profileCompletion}%` }} /></div><small>Complete your profile, resume, skills, and career preferences to unlock better matches.</small></div><div className="saved-job-actions"><Link to="/profile" className="secondary-btn small-btn">Update profile</Link><Link to="/resume" className="secondary-btn small-btn">Add resume</Link></div></div><div className="panel-card large-panel"><div className="panel-heading"><h3>Application status</h3></div>{chartData.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#4f46e5" /></BarChart></ResponsiveContainer> : <div className="empty-state">No application status data for this filter.</div>}<p className="chart-summary">{chartData.length ? chartData.map((item) => `${item.name}: ${item.value}`).join(' · ') : 'Add an application to see status analytics.'}</p></div></div>
    <div className="charts-grid"><div className="panel-card large-panel"><div className="panel-heading"><h3>Applications over time</h3></div>{summary.trends.length ? <ResponsiveContainer width="100%" height={260}><LineChart data={summary.trends}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="applications" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer> : <div className="empty-state">No dated applications in this range.</div>}<p className="chart-summary">Trends use application dates when available, otherwise record creation dates.</p></div><div className="panel-card large-panel"><div className="panel-heading"><h3>Recommended jobs</h3></div><div className="list-stack">{summary.recentApplications.length ? summary.recentApplications.slice(0, 3).map((job) => <Link to="/recommendations" key={job._id || job.id} className="list-row"><div><strong>{job.title}</strong><span>{job.company} · {job.location || 'Remote'}</span></div><span className="status-pill" style={{ background: '#eef2ff', color: '#4f46e5' }}>AI match</span></Link>) : <div className="empty-state">Create a profile and open Recommendations to generate your first suggestions.</div>}</div><div className="saved-job-actions"><Link to="/recommendations" className="secondary-btn small-btn">Open recommendations</Link></div></div></div>
    <div className="dashboard-intelligence-grid"><div className="panel-card"><div className="panel-heading"><h3>Application funnel</h3></div><div className="funnel-list">{['Saved', 'Applied', 'Interview', 'Offer'].map((status) => <div key={status}><span>{status}</span><strong>{summary.statusCounts[status] || 0}</strong></div>)}</div><p className="chart-summary">Counts reflect current records and do not assume every application follows this sequence.</p></div><div className="panel-card"><div className="panel-heading"><h3>Career preparation</h3></div><div className="readiness-list"><div><span>Resume</span><strong>{summary.readiness.resumeAvailable ? 'Available' : 'Not created'}</strong></div><div><span>ATS analysis</span><strong>{summary.readiness.atsAvailable ? 'Available' : 'Not analyzed'}</strong></div><div><span>Interview practice</span><strong>{summary.readiness.interviewPracticeSessions} sessions</strong></div><div><span>Roadmap progress</span><strong>{summary.readiness.roadmapCompletion}%</strong></div><div><span>Profile</span><strong>{summary.readiness.profileComplete ? 'Target set' : 'Incomplete'}</strong></div></div></div><div className="panel-card"><div className="panel-heading"><h3>Next actions</h3></div>{summary.nextActions.length ? <div className="action-stack">{summary.nextActions.map((action) => <Link to={action.path} className="next-action" key={action.title}><strong>{action.title}</strong><span>{action.description}</span><small>{action.priority} priority</small></Link>)}</div> : <div className="empty-state">No pending actions found.</div>}</div></div>
    <div className="dashboard-lower-grid"><div className="panel-card"><div className="panel-heading"><h3>Recent applications</h3><Link to="/jobs" className="text-button">View all</Link></div>{summary.recentApplications.length ? <div className="list-stack">{summary.recentApplications.map((job) => <Link to="/jobs" key={job._id} className="list-row"><div><strong>{job.title}</strong><span>{job.company} · {job.location || 'Location not set'}</span><small>{job.applicationDate || 'Date not set'}</small></div><span className="status-pill" style={{ background: `${statusColors[job.status] || '#4f46e5'}22`, color: statusColors[job.status] || '#4f46e5' }}>{job.status || 'Other'}</span></Link>)}</div> : <div className="empty-state">
  <strong>No applications yet</strong>
  <span>Start tracking your job applications to see them here.</span>
  <Link to="/jobs" className="text-button">Add your first application</Link>
</div>}</div><div className="panel-card"><div className="panel-heading"><h3>Upcoming interviews</h3><Link to="/interview" className="text-button">Prepare</Link></div>{summary.upcomingInterviews.length ? <div className="list-stack">{summary.upcomingInterviews.slice(0, 5).map((job) => <div className="list-row" key={job._id}><div><strong>{job.title}</strong><span>{job.company} · {job.interviewDate} {job.interviewTime || ''}</span><small>{job.interviewType || 'Interview'}</small></div><CalendarDays size={16} /></div>)}</div> : <div className="empty-state">No upcoming interviews.</div>}</div><div className="panel-card"><div className="panel-heading"><h3>Recent activity</h3></div>{summary.recentActivity.length ? <div className="activity-list">{summary.recentActivity.map((item) => <Link to={item.path} className="activity-item" key={`${item.label}-${item.date}`}><span>{item.label}</span><small>{new Date(item.date).toLocaleDateString()}</small></Link>)}</div> : <div className="empty-state">No activity history available yet.</div>}</div><div className="panel-card"><div className="panel-heading"><h3>Quick actions</h3></div><div className="action-stack"><Link to="/jobs" className="primary-btn small-btn">Add Job</Link><Link to="/resume" className="secondary-btn small-btn">Build Resume</Link><Link to="/ats" className="secondary-btn small-btn">Check ATS Score</Link><Link to="/interview" className="secondary-btn small-btn">Practice Interview</Link><Link to="/career" className="secondary-btn small-btn">Career Guidance</Link><Link to="/saved-jobs" className="secondary-btn small-btn">View Saved Jobs</Link></div></div></div>
  </div>;
}

function RecommendationsPage({ auth, jobs, resume, toggleBookmark }) {
  const [form, setForm] = useState({
    skills: resume?.skills?.join(', ') || 'React, JavaScript, SQL, Node.js',
    education: 'Bachelor\'s in Computer Science',
    experience: '3',
    role: 'Frontend Developer',
    location: 'Remote',
    workMode: 'Remote',
    salary: '120000',
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const generateRecommendations = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          ...form,
          skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
          experience: Number(form.experience) || 0,
          salary: Number(form.salary) || 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to generate recommendations.');
      setResults(data.recommendations || []);
    } catch (recommendationError) {
      setError(recommendationError.message || 'Unable to generate recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const applyToJob = async (job) => {
    try {
      const response = await fetch('http://localhost:5001/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ title: job.title, company: job.company, location: job.location, salary: job.salary, workArrangement: job.workMode, status: 'Applied', requiredSkills: job.matchingSkills.concat(job.missingSkills), notes: 'Added from Job Recommendations.' }) });
      if (!response.ok) throw new Error('Unable to add this recommendation to applications.');
      setActionMessage(`${job.title} was added to your applications.`);
    } catch (actionError) { setActionMessage(actionError.message); }
  };

  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading">
          <div>
            <h3>AI Job Recommendations</h3>
            <p className="panel-subtitle">Match your profile with higher-fit opportunities.</p>
          </div>
        </div>

        <form onSubmit={generateRecommendations} className="job-form">
          <div className="form-grid two-cols">
            <label className="field-label"><span>Skills</span><input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} /></label>
            <label className="field-label"><span>Education</span><input value={form.education} onChange={(event) => setForm({ ...form, education: event.target.value })} /></label>
            <label className="field-label"><span>Experience (years)</span><input type="number" min="0" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} /></label>
            <label className="field-label"><span>Preferred role</span><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /></label>
            <label className="field-label"><span>Preferred location</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label className="field-label"><span>Work mode</span><select value={form.workMode} onChange={(event) => setForm({ ...form, workMode: event.target.value })}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
            <label className="field-label"><span>Salary expectation</span><input type="number" min="0" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate recommendations'}</button>
          </div>
          {error && <div className="error-box" style={{ marginTop: '12px' }}>{error}</div>}
          {actionMessage && <div className="info-box" style={{ marginTop: '12px' }} role="status">{actionMessage}</div>}
        </form>

        {!results.length && !loading ? (
          <div className="empty-state" style={{ marginTop: '20px' }}>No recommendations yet. Complete your preferences, then generate a match list.</div>
        ) : null}

        {results.length > 0 && (
          <div className="saved-job-grid" style={{ marginTop: '20px' }}>
            {results.map((job) => (
              <article className="saved-job-card" key={`${job.company}-${job.title}`}>
                <div className="saved-job-card-top">
                  <div className="company-initials">{String(job.company || 'JT').slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h3>{job.title}</h3>
                    <strong>{job.company}</strong>
                  </div>
                  <span className="priority-badge priority-high">{job.matchPercentage}% match</span>
                </div>

                <div className="saved-job-meta">
                  <span>{job.location}</span>
                  <span>{job.workMode}</span>
                  <span>{job.salary || 'Salary not listed'}</span>
                </div>

                <div className="saved-job-status">
                  <span className="status-pill">Skills match</span>
                  <span>{job.matchingSkills.length} matched · {job.missingSkills.length} missing</span>
                </div>

                <div className="result-block">
                  <h4>Matching skills</h4>
                  <div className="tag-group">{job.matchingSkills.map((item) => <span key={item} className="tag">{item}</span>)}</div>
                </div>

                <div className="result-block">
                  <h4>Missing skills</h4>
                  <div className="tag-group">{job.missingSkills.length ? job.missingSkills.map((item) => <span key={item} className="tag warning-tag">{item}</span>) : <span className="muted-copy">None</span>}</div>
                </div>

                <div className="result-block">
                  <h4>Why this matches</h4>
                  <p>{job.reason}</p>
                </div>
                <div className="saved-job-actions">
                  {job.url ? <a className="secondary-btn small-btn" href={job.url} target="_blank" rel="noreferrer">Open job</a> : <span className="muted-copy">Job link unavailable</span>}
                  <button className="secondary-btn small-btn" type="button" onClick={() => toggleBookmark({ ...job, id: `${job.company}-${job.title}` })}>Save job</button>
                  <button className="primary-btn small-btn" type="button" onClick={() => applyToJob(job)}>Apply / track</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillGapPage({ auth, jobs, resume }) {
  const [jobId, setJobId] = useState('');
  const [skills, setSkills] = useState(resume?.skills?.join(', ') || 'React, JavaScript, SQL, Node.js');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (!jobs.length) return;
    const firstJob = jobs[0];
    setJobId(String(firstJob._id || firstJob.id));
  }, [jobs]);

  const handleJobSelection = (event) => {
    const selected = jobs.find((job) => String(job._id || job.id) === event.target.value);
    setJobId(event.target.value);
    setRequiredSkills(Array.isArray(selected?.requiredSkills) ? selected.requiredSkills.join(', ') : '');
  };

  const analyzeSkillGap = async () => {
    const currentSkills = skills.split(',').map((item) => item.trim()).filter(Boolean);
    try {
      if (auth.token && resume) await fetch('http://localhost:5001/api/resume', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ ...resume, skills: currentSkills }) });
      const response = await fetch(`http://localhost:5001/api/skill-gap/${jobId}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to analyze skill gap.');
      setAnalysis({ ...data, matching: data.matchingSkills, missing: data.missingSkills, priorities: data.missingSkills.map((item) => ({ ...item, learning: `Practice ${item.skill} through a project or course.` })) });
    } catch (error) { setAnalysis({ error: error.message }); }
  };

  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading">
          <div>
            <h3>Skill Gap Analysis</h3>
            <p className="panel-subtitle">Compare your current skills against the selected job requirements.</p>
          </div>
        </div>

        <div className="form-grid two-cols">
          <label className="field-label"><span>Select job</span><select value={jobId} onChange={handleJobSelection}>{jobs.length ? jobs.map((job) => <option key={String(job._id || job.id)} value={String(job._id || job.id)}>{job.title}</option>) : <option value="">No jobs available</option>}</select></label>
          <label className="field-label"><span>Your current skills</span><input value={skills} onChange={(event) => setSkills(event.target.value)} /></label>
          <label className="field-label full-span"><span>Required skills for target role</span><textarea rows="4" value={requiredSkills} onChange={(event) => setRequiredSkills(event.target.value)} /></label>
        </div>

        <div className="form-actions">
          <button className="primary-btn" type="button" onClick={analyzeSkillGap}>Analyze skill gap</button>
        </div>

        {analysis?.error && <p className="form-error" role="alert">{analysis.error}</p>}
        {analysis && !analysis.error && (
          <div style={{ marginTop: '20px' }}>
            <div className="ats-summary">
              <div className="score-ring" style={{ background: `conic-gradient(#4f46e5 ${analysis.matchPercentage}%, #e5e7eb ${analysis.matchPercentage}% 100%)` }}>
                <div><strong>{analysis.matchPercentage}</strong><span>%</span></div>
              </div>
              <div>
                <span className="result-kicker">Fit score</span>
                <h4>Current skill match</h4>
                <p>{analysis.matching.length} matching skills and {analysis.missing.length} skills to close.</p>
              </div>
            </div>

            <div className="ats-result-columns" style={{ marginTop: '20px' }}>
              <div className="result-block">
                <h4>Matching skills</h4>
                <div className="tag-group">{analysis.matching.length ? analysis.matching.map((item) => <span key={item} className="tag">{item}</span>) : <span className="muted-copy">None</span>}</div>
              </div>
              <div className="result-block">
                <h4>Missing skills</h4>
                <div className="tag-group">{analysis.missing.length ? analysis.missing.map((item) => <span key={item.skill} className="tag warning-tag">{item.skill}</span>) : <span className="muted-copy">None</span>}</div>
              </div>
              <div className="result-block">
                <h4>Priority</h4>
                {analysis.priorities.length ? analysis.priorities.map((item) => <p key={item.skill}>• {item.skill} — {item.priority}</p>) : <p className="muted-copy">No missing skills.</p>}
              </div>
              <div className="result-block">
                <h4>Recommended learning areas</h4>
                {analysis.priorities.length ? analysis.priorities.map((item) => <p key={`${item.skill}-learning`}>• {item.learning}</p>) : <p className="muted-copy">Your current skill profile covers most of the role requirements.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JobsPage({ jobs, setJobs, getSelectedStatus, toggleBookmark, bookmarks, auth }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [workFilter, setWorkFilter] = useState('All');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [salaryMinimum, setSalaryMinimum] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const emptyJob = { title: '', company: '', location: '', jobType: 'Full-time', salary: '', status: 'Wishlist', url: '', applicationDate: '', deadline: '', notes: '', workArrangement: '', experienceLevel: '', priority: 'Medium', description: '', requiredSkills: '', contactPerson: '', contactEmail: '', source: '', followUpDate: '', followUpCompleted: false, followUpNotes: '', interviewDate: '', interviewTime: '', interviewType: '', interviewRound: '', interviewStatus: '', interviewNotes: '', meetingLink: '' };
  const [newJob, setNewJob] = useState(emptyJob);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const visibleJobs = jobs.filter((job) => {
    const matchesSearch = `${job.title} ${job.company} ${job.location} ${job.description} ${job.notes} ${(job.requiredSkills || []).join(' ')}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || job.priority === priorityFilter;
    const matchesExperience = experienceFilter === 'All' || job.experienceLevel === experienceFilter;
    const matchesWork = workFilter === 'All' || job.workArrangement === workFilter;
    const matchesType = jobTypeFilter === 'All' || job.jobType === jobTypeFilter;
    const salaryValue = Number(String(job.salary || '').replace(/[^0-9]/g, '').slice(0, 6)) || 0;
    const matchesSalary = !salaryMinimum || salaryValue >= Number(salaryMinimum);
    return matchesSearch && matchesStatus && matchesPriority && matchesExperience && matchesWork && matchesType && matchesSalary;
  }).sort((left, right) => {
    if (sortBy === 'deadline') return String(left.deadline || '9999-12-31').localeCompare(String(right.deadline || '9999-12-31'));
    if (sortBy === 'company') return String(left.company || '').localeCompare(String(right.company || ''));
    if (sortBy === 'title') return String(left.title || '').localeCompare(String(right.title || ''));
    if (sortBy === 'salary') return (Number(String(right.salary || '').replace(/[^0-9]/g, '').slice(0, 6)) || 0) - (Number(String(left.salary || '').replace(/[^0-9]/g, '').slice(0, 6)) || 0);
    if (sortBy === 'relevance') return Number(right.priority === 'High') - Number(left.priority === 'High');
    return new Date(right.updatedAt || right.createdAt || right.applicationDate || 0) - new Date(left.updatedAt || left.createdAt || left.applicationDate || 0);
  });

  const handleSave = async (event) => {
    event.preventDefault();

    const payload = { ...newJob, requiredSkills: String(newJob.requiredSkills || '').split(',').map((skill) => skill.trim()).filter(Boolean) };

    if (auth?.token) {
      try {
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `http://localhost:5001/api/jobs/${editingId}` : 'http://localhost:5001/api/jobs';
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Unable to save job.');
        const data = await response.json();
        const savedJob = data.job || { ...payload, id: editingId || Date.now() };
        setJobs((current) => {
          if (isEditing) return current.map((item) => (item.id === editingId ? savedJob : item));
          return [savedJob, ...current];
        });
      } catch (error) { setNewJob((current) => current); return; }
    } else {
      setJobs((current) => {
        if (isEditing) return current.map((item) => (item.id === editingId ? { ...item, ...payload } : item));
        return [{ id: Date.now(), ...payload }, ...current];
      });
    }

    setNewJob(emptyJob);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (job) => {
    setNewJob({ ...emptyJob, ...job, requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : job.requiredSkills || '' });
    setIsEditing(true);
    setEditingId(job.id);
  };

  const handleDelete = async (id) => {
    if (auth?.token) {
      try {
        const response = await fetch(`http://localhost:5001/api/jobs/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!response.ok) throw new Error('Unable to delete job.');
      } catch { return; }
    }

    setJobs((current) => current.filter((job) => job.id !== id));
  };

  const moveStatus = async (id, direction) => {
    const order = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'];
    const currentJob = jobs.find((job) => job.id === id);
    if (!currentJob) return;

    const currentIndex = order.indexOf(currentJob.status);
    const nextIndex = Math.max(0, Math.min(order.length - 1, currentIndex + direction));
    const nextStatus = order[nextIndex];

    if (auth?.token) {
      try {
        const response = await fetch(`http://localhost:5001/api/jobs/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ ...currentJob, status: nextStatus }),
        });
        if (!response.ok) throw new Error('Unable to update status.');
      } catch { return; }
    }

    setJobs((current) => current.map((job) => {
      if (job.id !== id) return job;
      return { ...job, status: nextStatus };
    }));
  };

  return (
    <div className="page-section jobs-page">
      <div className="panel-card form-panel">
        <div className="panel-heading"><h3>{isEditing ? 'Edit Job' : 'Add Job'}</h3></div>
        <form onSubmit={handleSave} className="job-form">
          <div className="form-grid two-cols">
            <input value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} placeholder="Job title" required />
            <input value={newJob.company} onChange={(e) => setNewJob({ ...newJob, company: e.target.value })} placeholder="Company" required />
            <input value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} placeholder="Location" />
            <select value={newJob.jobType} onChange={(e) => setNewJob({ ...newJob, jobType: e.target.value })}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
            <input value={newJob.salary} onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })} placeholder="Salary" />
            <input value={newJob.url} onChange={(e) => setNewJob({ ...newJob, url: e.target.value })} placeholder="Job URL" />
            <input type="date" value={newJob.applicationDate} onChange={(e) => setNewJob({ ...newJob, applicationDate: e.target.value })} />
            <input type="date" value={newJob.deadline} onChange={(e) => setNewJob({ ...newJob, deadline: e.target.value })} />
            <select value={newJob.workArrangement} onChange={(e) => setNewJob({ ...newJob, workArrangement: e.target.value })}><option value="">Work arrangement</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select>
            <select value={newJob.experienceLevel} onChange={(e) => setNewJob({ ...newJob, experienceLevel: e.target.value })}><option value="">Experience level</option><option>Internship</option><option>Entry Level</option><option>Mid Level</option><option>Senior</option></select>
            <select value={newJob.priority} onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
            <select value={newJob.source} onChange={(e) => setNewJob({ ...newJob, source: e.target.value })}><option value="">Source</option><option>LinkedIn</option><option>Company Website</option><option>Referral</option><option>Job Portal</option><option>Other</option></select>
            <select value={newJob.status} onChange={(e) => setNewJob({ ...newJob, status: e.target.value })}>
              <option>Wishlist</option>
              <option>Applied</option>
              <option>Screening</option>
              <option>Interview</option>
              <option>Offer</option>
              <option>Accepted</option>
              <option>Rejected</option>
              <option>Withdrawn</option>
            </select>
            <input value={newJob.contactPerson} onChange={(e) => setNewJob({ ...newJob, contactPerson: e.target.value })} placeholder="Contact person" />
            <input type="email" value={newJob.contactEmail} onChange={(e) => setNewJob({ ...newJob, contactEmail: e.target.value })} placeholder="Contact email" />
            <input type="date" value={newJob.followUpDate} onChange={(e) => setNewJob({ ...newJob, followUpDate: e.target.value })} />
            <input value={newJob.requiredSkills} onChange={(e) => setNewJob({ ...newJob, requiredSkills: e.target.value })} placeholder="Required skills, comma separated" />
            <textarea value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} placeholder="Job description" className="full-span" rows="4" />
            <textarea value={newJob.notes} onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })} placeholder="Notes and follow-up notes" className="full-span" rows="2" />
            <div className="section-heading-row full-span"><strong>Interview details</strong></div>
            <input type="date" value={newJob.interviewDate} onChange={(e) => setNewJob({ ...newJob, interviewDate: e.target.value })} />
            <input type="time" value={newJob.interviewTime} onChange={(e) => setNewJob({ ...newJob, interviewTime: e.target.value })} />
            <input value={newJob.interviewType} onChange={(e) => setNewJob({ ...newJob, interviewType: e.target.value })} placeholder="Interview type / round" />
            <input value={newJob.meetingLink} onChange={(e) => setNewJob({ ...newJob, meetingLink: e.target.value })} placeholder="Meeting link" />
          </div>
          <div className="form-actions">
            <button type="submit" className="primary-btn">{isEditing ? 'Save changes' : 'Add job'}</button>
            {isEditing && <button type="button" className="secondary-btn" onClick={() => { setIsEditing(false); setEditingId(null); setNewJob(emptyJob); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="panel-card">
        <div className="panel-heading inline-heading">
          <h3>Job Tracker</h3>
          <div className="toolbar">
            <div className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              <option value="Wishlist">Wishlist</option>
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select>
            <select value={workFilter} onChange={(e) => setWorkFilter(e.target.value)}><option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select>
            <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)}><option>All</option><option>Internship</option><option>Entry Level</option><option>Mid Level</option><option>Senior</option></select>
            <select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)}><option>All</option><option>Full-time</option><option>Part-time</option><option>Contract</option></select>
            <input type="number" min="0" value={salaryMinimum} onChange={(e) => setSalaryMinimum(e.target.value)} placeholder="Min salary" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="newest">Latest</option><option value="deadline">Deadline soonest</option><option value="salary">Salary</option><option value="relevance">Relevance</option><option value="company">Company</option><option value="title">Job title</option></select>
            <button className="secondary-btn small-btn" type="button" onClick={() => { setSearch(''); setStatusFilter('All'); setPriorityFilter('All'); setExperienceFilter('All'); setWorkFilter('All'); setJobTypeFilter('All'); setSalaryMinimum(''); setSortBy('newest'); }}>Clear filters</button>
          </div>
        </div>

        <div className="board-grid">
          {['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'].map((status) => (
            <div key={status} className="kanban-column">
              <div className="kanban-header">
                <h4>{status}</h4>
                <span>{visibleJobs.filter((job) => job.status === status).length}</span>
              </div>
              <div className="kanban-list">
                {visibleJobs.filter((job) => job.status === status).map((job) => (
                  <div key={job.id} className="kanban-card">
                    <div className="card-head">
                      <strong>{job.title}</strong>
                      <div className="mini-actions">
                        <button onClick={() => handleEdit(job)} className="small-btn ghost-btn">Edit</button>
                        <button onClick={() => handleDelete(job.id)} className="small-btn ghost-btn danger">Delete</button>
                        {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="small-btn ghost-btn">Open</a>}
                      </div>
                    </div>
                    <span>{job.company}</span>
                    <small>{job.location || 'Location not set'} • {job.salary || 'Salary not set'}</small>
                    <small>{job.workArrangement || 'Work arrangement not set'} • Priority: {job.priority || 'Medium'}{job.deadline ? ` • Deadline: ${job.deadline}` : ''}</small>
                    {job.followUpDate && <small>Follow up: {job.followUpDate}{job.followUpCompleted ? ' • Completed' : ''}</small>}
                    <div className="card-controls">
                      <button onClick={() => toggleBookmark(job)} className="tiny-btn">{bookmarks?.some((bookmark) => bookmark.targetId === job.id) ? 'Saved' : 'Save'}</button>
                      <button onClick={() => moveStatus(job.id, -1)} className="tiny-btn">Prev</button>
                      <button onClick={() => moveStatus(job.id, 1)} className="tiny-btn">Next</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavedJobsPage({ jobs, setJobs, bookmarks, toggleBookmark, auth }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [workFilter, setWorkFilter] = useState('All');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedJob, setSelectedJob] = useState(null);
  const [error, setError] = useState('');
  const savedJobIds = new Set((bookmarks || []).map((bookmark) => String(bookmark.targetId || bookmark.id)));
  const saved = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const searchable = `${job.title} ${job.company} ${job.location} ${(job.requiredSkills || []).join(' ')} ${job.description || ''}`.toLowerCase();
      return savedJobIds.has(String(job._id || job.id)) && searchable.includes(search.toLowerCase()) && (statusFilter === 'All' || (job.status || 'Wishlist') === statusFilter) && (priorityFilter === 'All' || (job.priority || 'Medium') === priorityFilter) && (workFilter === 'All' || (job.workArrangement || '') === workFilter);
    });
    return [...filtered].sort((left, right) => {
      if (sortBy === 'deadline') return String(left.deadline || '9999-12-31').localeCompare(String(right.deadline || '9999-12-31'));
      if (sortBy === 'oldest') return new Date(left.createdAt || left.applicationDate || 0) - new Date(right.createdAt || right.applicationDate || 0);
      if (sortBy === 'company') return String(left.company || '').localeCompare(String(right.company || ''));
      if (sortBy === 'priority') return ({ High: 0, Medium: 1, Low: 2 }[left.priority || 'Medium'] || 1) - ({ High: 0, Medium: 1, Low: 2 }[right.priority || 'Medium'] || 1);
      return new Date(right.createdAt || right.applicationDate || 0) - new Date(left.createdAt || left.applicationDate || 0);
    });
  }, [jobs, bookmarks, search, statusFilter, priorityFilter, workFilter, sortBy]);

  const updateJob = async (job, changes) => {
    try {
      const response = await fetch(`http://localhost:5001/api/jobs/${job._id || job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(changes) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update saved job.');
      setJobs((current) => current.map((item) => String(item._id || item.id) === String(job._id || job.id) ? (data.job || { ...item, ...changes }) : item));
      setSelectedJob((current) => current ? { ...current, ...(data.job || changes) } : current);
    } catch (updateError) { setError(updateError.message); }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Delete ${job.title} from your jobs?`)) return;
    try {
      const response = await fetch(`http://localhost:5001/api/jobs/${job._id || job.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` } });
      if (!response.ok) throw new Error('Unable to delete job.');
      setJobs((current) => current.filter((item) => String(item._id || item.id) !== String(job._id || job.id)));
      setSelectedJob(null);
    } catch (deleteError) { setError(deleteError.message); }
  };

  const summary = {
    total: saved.length,
    applied: saved.filter((job) => ['Applied', 'Screening', 'Interview', 'Offer', 'Accepted'].includes(job.status)).length,
    deadlines: saved.filter((job) => job.deadline && new Date(job.deadline) >= new Date()).length,
    interviews: saved.filter((job) => job.interviewDate && job.interviewStatus !== 'Completed').length,
    highPriority: saved.filter((job) => job.priority === 'High').length,
  };
  const initials = (company) => String(company || '?').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const clearFilters = () => { setSearch(''); setStatusFilter('All'); setPriorityFilter('All'); setWorkFilter('All'); setSortBy('latest'); };

  return <div className="page-section saved-jobs-page"><div className="panel-card saved-jobs-panel">
    <div className="saved-jobs-heading"><div><p className="eyebrow">OPPORTUNITIES</p><h2>Saved Jobs</h2><p className="panel-subtitle">Manage and track opportunities you want to apply for.</p></div><div className="saved-jobs-actions"><Link to="/jobs" className="primary-btn">Add Job</Link><Link to="/jobs" className="secondary-btn">Browse Job Tracker</Link></div></div>
    <div className="saved-summary-grid">{[['Total Saved Jobs', summary.total], ['Jobs Applied', summary.applied], ['Upcoming Deadlines', summary.deadlines], ['Interviews Scheduled', summary.interviews], ['High-Priority Jobs', summary.highPriority]].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="saved-toolbar"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, company, location, or skills" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Wishlist</option><option>Applied</option><option>Screening</option><option>Interview</option><option>Offer</option><option>Accepted</option><option>Rejected</option><option>Withdrawn</option></select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select><select value={workFilter} onChange={(event) => setWorkFilter(event.target.value)}><option>All</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="latest">Recently saved</option><option value="oldest">Oldest</option><option value="deadline">Deadline</option><option value="priority">Priority</option><option value="company">Company</option></select><button className="secondary-btn small-btn" type="button" onClick={clearFilters}>Clear filters</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="saved-result-count">Showing {saved.length} saved job{saved.length === 1 ? '' : 's'}</p>
    {!saved.length ? <div className="empty-state saved-empty"><h3>No saved jobs yet</h3><p>Save opportunities you are interested in and manage your job search from one place.</p><div className="saved-jobs-actions"><Link to="/jobs" className="primary-btn">Add Your First Job</Link><Link to="/jobs" className="secondary-btn">Browse Job Tracker</Link></div></div> : <div className="saved-job-grid">{saved.map((job) => <article className="saved-job-card" key={job._id || job.id}><div className="saved-job-card-top"><div className="company-initials">{initials(job.company)}</div><div><h3>{job.title}</h3><strong>{job.company}</strong></div><span className={`priority-badge priority-${String(job.priority || 'Medium').toLowerCase()}`}>{job.priority || 'Medium'}</span></div><div className="saved-job-meta"><span>{job.location || 'Location not set'}</span><span>{job.workArrangement || 'Work type not set'}</span><span>{job.jobType || 'Employment type not set'}</span><span>{job.salary || 'Salary not set'}</span></div><div className="saved-job-status"><span className="status-pill">{job.status || 'Wishlist'}</span><span>{job.deadline ? `Deadline: ${job.deadline}` : 'No deadline'}</span></div><div className="saved-job-actions"><button className="secondary-btn small-btn" type="button" onClick={() => setSelectedJob(job)}>View Details</button>{job.url && <a className="secondary-btn small-btn" href={job.url} target="_blank" rel="noreferrer">Apply Now</a>}<button className="small-btn ghost-btn" type="button" onClick={() => updateJob(job, { priority: job.priority === 'High' ? 'Medium' : 'High' })}>Priority</button><button className="small-btn ghost-btn danger" type="button" onClick={() => deleteJob(job)}>Delete</button></div></article>)}</div>}
    {selectedJob && <div className="job-details-backdrop" role="presentation" onClick={() => setSelectedJob(null)}><section className="job-details-modal" role="dialog" aria-modal="true" aria-labelledby="saved-job-details-title" onClick={(event) => event.stopPropagation()}><div className="panel-heading"><div><h2 id="saved-job-details-title">{selectedJob.title}</h2><p>{selectedJob.company} · {selectedJob.location || 'Location not set'}</p></div><button className="secondary-btn" type="button" onClick={() => setSelectedJob(null)}>Close</button></div><div className="job-details-grid"><div><strong>Status</strong><select value={selectedJob.status || 'Wishlist'} onChange={(event) => updateJob(selectedJob, { status: event.target.value })}><option>Wishlist</option><option>Applied</option><option>Screening</option><option>Interview</option><option>Offer</option><option>Accepted</option><option>Rejected</option><option>Withdrawn</option></select></div><div><strong>Priority</strong><select value={selectedJob.priority || 'Medium'} onChange={(event) => updateJob(selectedJob, { priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></div><div><strong>Deadline</strong><span>{selectedJob.deadline || 'Not set'}</span></div><div><strong>Saved date</strong><span>{selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString() : selectedJob.applicationDate || 'Not set'}</span></div></div><div className="job-details-copy"><h4>Job description</h4><p>{selectedJob.description || 'No job description saved.'}</p><h4>Required skills</h4><p>{Array.isArray(selectedJob.requiredSkills) && selectedJob.requiredSkills.length ? selectedJob.requiredSkills.join(', ') : 'No required skills saved.'}</p><h4>Notes</h4><p>{selectedJob.notes || 'No notes saved.'}</p></div><div className="saved-job-actions"><Link className="secondary-btn" to="/ats">Check Resume Match</Link>{selectedJob.url && <a className="primary-btn" href={selectedJob.url} target="_blank" rel="noreferrer">Open Original Job</a>}<button className="secondary-btn danger" type="button" onClick={() => deleteJob(selectedJob)}>Delete Job</button></div></section></div>}
  </div></div>;
}

function BookmarksPage({ bookmarks }) {
  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading"><h3>Bookmarks</h3></div>
        {bookmarks.length === 0 ? <div className="empty-state">No bookmarks yet.</div> : (
          <div className="bookmark-list">
            {bookmarks.map((item) => (
              <div className="bookmark-row" key={item.id}>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.type} • {item.company || 'Career resource'}</p>
                </div>
                <button className="small-btn ghost-btn">Open</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumeBuilderPage({ resume, setResume, auth }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const resumeRef = useRef(null);

  const template = resume?.template || 'Modern';
  const normalizedResume = normalizeResumeData(resume);
  const aiNotice = 'AI features are running in local heuristic mode because no OpenAI API key is configured in this environment.';

  const saveResume = useCallback(async (showMessage = true) => {
    if (!auth?.token || !resume) return false;

    try {
      const response = await fetch('http://localhost:5001/api/resume', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(normalizeResumeData(resume)),
      });

      if (!response.ok) {
        throw new Error('Unable to save resume.');
      }

      if (showMessage) {
        setSaveStatus('Resume saved');
      }
      return true;
    } catch (error) {
      const message = error.message || 'Save failed';
      setSaveStatus(message);
      return false;
    }
  }, [auth?.token, resume]);

  useEffect(() => {
    if (!auth?.token || !resume) return;

    const timer = setTimeout(() => {
      saveResume(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [auth?.token, resume, saveResume]);

  const updateField = (field, value) => {
    setResume((current) => normalizeResumeData({ ...normalizeResumeData(current), [field]: value }));
  };

  const updateNestedField = (section, index, field, value) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      next[section] = next[section].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item);
      return next;
    });
  };

  const updateListField = (section, index, listIndex, value) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      const target = next[section][index];
      if (!target) return next;
      target[listIndex] = value;
      return next;
    });
  };

  const pushNewItem = (section, factory) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      next[section] = [...next[section], factory()];
      return next;
    });
  };

  const removeItem = (section, index) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      next[section] = next[section].filter((_, itemIndex) => itemIndex !== index);
      if (next[section].length === 0) {
        if (section === 'experience') next[section] = [createExperienceItem()];
        if (section === 'education') next[section] = [createEducationItem()];
        if (section === 'projects') next[section] = [createProjectItem()];
      }
      return next;
    });
  };

  const moveItem = (section, index, direction) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next[section].length) return next;
      const reordered = [...next[section]];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      next[section] = reordered;
      return next;
    });
  };

  const addListEntry = (section, index) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      const target = next[section][index];
      if (!target) return next;
      target.bullets = [...(target.bullets || []), ''];
      return next;
    });
  };

  const removeListEntry = (section, index, bulletIndex) => {
    setResume((current) => {
      const next = normalizeResumeData(current);
      const target = next[section][index];
      if (!target) return next;
      target.bullets = (target.bullets || []).filter((_, itemIndex) => itemIndex !== bulletIndex);
      if (!target.bullets.length) target.bullets = [''];
      return next;
    });
  };

  const handlePrint = () => window.print();

  const sanitizeFileName = (name) => String(name || 'Resume').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'Resume';

  const getResumeWarnings = () => {
    const warnings = [];

    if (!normalizedResume.fullName) warnings.push('Missing full name.');
    if (!normalizedResume.email) warnings.push('Missing email.');
    if (!normalizedResume.summary || normalizedResume.summary.length < 70) warnings.push('Professional summary is too short.');
    if (normalizedResume.summary && normalizedResume.summary.length > 450) warnings.push('Summary is quite long; consider tightening it for clarity.');
    if ((!normalizedResume.experience || normalizedResume.experience.length === 0) || normalizedResume.experience.every((item) => !item.company && !item.position && !item.bullets?.some(Boolean))) warnings.push('Add at least one work experience entry.');
    if (!normalizedResume.skills || normalizedResume.skills.length === 0) warnings.push('Add key skills.');

    normalizedResume.experience?.forEach((item) => {
      const bulletText = (item.bullets || []).join(' ');
      if (bulletText && bulletText.length < 80) {
        warnings.push('Some experience bullet points are too brief to show impact.');
      }
    });

    const measurableText = `${normalizedResume.summary} ${normalizedResume.experience.map((item) => item.bullets.join(' ')).join(' ')}`;
    if (!/(\d+%|\d+\+|\d+\s*(x|times|k)|\$|reduced|improved|increased|grew|boosted|saved)/i.test(measurableText)) {
      warnings.push('No measurable achievements detected yet; add impact-driven results.');
    }

    return warnings;
  };

  const atsBreakdown = useMemo(() => {
    const checks = [
      { label: 'Contact information', score: Boolean(normalizedResume.fullName && normalizedResume.email && normalizedResume.phone) ? 100 : 60 },
      { label: 'Professional summary', score: normalizedResume.summary && normalizedResume.summary.length >= 80 ? 100 : 70 },
      { label: 'Skills section', score: normalizedResume.skills && normalizedResume.skills.length >= 6 ? 100 : 75 },
      { label: 'Experience details', score: normalizedResume.experience && normalizedResume.experience.some((item) => item.company || item.position || item.bullets?.some(Boolean)) ? 100 : 65 },
      { label: 'Education section', score: normalizedResume.education && normalizedResume.education.some((entry) => entry.institution || entry.degree) ? 100 : 70 },
      { label: 'Keywords', score: /react|javascript|sql|python|product|leadership|design|analytics/i.test([normalizedResume.summary, normalizedResume.skills.join(' ')].join(' ')) ? 90 : 70 },
      { label: 'Bullet point quality', score: normalizedResume.experience?.some((item) => (item.bullets || []).some((bullet) => bullet.length > 40)) ? 100 : 75 },
      { label: 'Section completeness', score: [normalizedResume.summary, normalizedResume.experience?.length, normalizedResume.skills?.length, normalizedResume.education?.length].every(Boolean) ? 100 : 80 },
    ];

    const overall = Math.round(checks.reduce((total, item) => total + item.score, 0) / checks.length);
    return { checks, overall };
  }, [normalizedResume]);

  const warnings = useMemo(() => getResumeWarnings(), [normalizedResume]);

  const generateAiText = (kind) => {
    const summary = normalizedResume.summary || 'Focused professional delivering measurable results across product, engineering, and operations.';
    const skills = (normalizedResume.skills || []).slice(0, 6).join(', ');
    const firstExperience = normalizedResume.experience?.[0];
    const roleText = normalizedResume.professionalTitle || 'professional';

    if (kind === 'summary') {
      const nextSummary = `${roleText} with a track record of delivering business impact through scalable systems, strong cross-functional collaboration, and measurable product improvements. Brings hands-on experience in ${skills || 'product strategy and technical execution'} with a focus on quality, performance, and stakeholder alignment.`;
      updateField('summary', nextSummary);
      return;
    }

    if (kind === 'bullet') {
      if (!firstExperience) {
        setSaveStatus('Add a work experience entry before generating an AI bullet.');
        return;
      }
      const bullet = `Led ${firstExperience.company || 'cross-functional initiatives'} by combining ${skills || 'technical expertise'} with strong execution, delivering measurable improvements in quality, speed, and team productivity.`;
      const nextExperience = [...normalizedResume.experience];
      nextExperience[0] = { ...firstExperience, bullets: [bullet, ...(firstExperience.bullets || []).slice(0, 2)] };
      setResume((current) => ({ ...normalizeResumeData(current), experience: nextExperience }));
      return;
    }

    if (kind === 'bullets') {
      const generated = [
        `Delivered measurable improvements in ${normalizedResume.professionalTitle || 'core business objectives'} by using data-driven decision-making and strong execution.`,
        `Partnered across teams to ship reliable, high-quality work that improved efficiency and customer outcomes.`,
        `Communicated clearly with stakeholders and translated business needs into practical solutions that scaled effectively.`,
      ];
      if (!normalizedResume.experience || !normalizedResume.experience.length) {
        setSaveStatus('Add an experience entry before generating bullet points.');
        return;
      }
      const nextExperience = [...normalizedResume.experience];
      nextExperience[0] = { ...nextExperience[0], bullets: generated };
      setResume((current) => ({ ...normalizeResumeData(current), experience: nextExperience }));
      return;
    }

    if (kind === 'ats') {
      const keywordLine = `${summary} ${skills}.`;
      updateField('summary', keywordLine);
      setSaveStatus('ATS optimization applied using existing data.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!resumeRef.current || !normalizedResume) {
      setPdfError('Unable to generate PDF. Please try again.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      setPdfError('');

      const fileName = `JobTrack_Resume_${sanitizeFileName(normalizedResume.fullName || 'Resume')}.pdf`;
      const exportNode = resumeRef.current.cloneNode(true);

      exportNode.style.position = 'fixed';
      exportNode.style.left = '-9999px';
      exportNode.style.top = '0';
      exportNode.style.visibility = 'visible';
      exportNode.style.display = 'block';
      exportNode.style.opacity = '1';
      exportNode.style.background = '#ffffff';
      exportNode.style.backgroundColor = '#ffffff';
      exportNode.style.color = '#111827';
      exportNode.style.boxShadow = 'none';
      exportNode.style.border = 'none';
      exportNode.style.maxWidth = 'none';
      exportNode.style.width = '794px';
      exportNode.style.minHeight = '0';
      exportNode.style.pointerEvents = 'none';
      exportNode.style.zIndex = '2147483647';

      document.body.appendChild(exportNode);

      const canvas = await html2canvas(exportNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: exportNode.scrollWidth,
        windowHeight: exportNode.scrollHeight,
      });

      document.body.removeChild(exportNode);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const contentWidth = canvas.width;
      const contentHeight = canvas.height;
      const imageRatio = contentWidth / contentHeight;
      const fullDocumentHeight = (printableWidth / imageRatio);
      const totalPages = Math.max(1, Math.ceil(fullDocumentHeight / printableHeight));

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const sliceStartMm = pageIndex * printableHeight;
        const sliceStartRatio = Math.min(sliceStartMm / fullDocumentHeight, 1);
        const sourceY = sliceStartRatio * contentHeight;
        const remainingHeight = Math.max(1, fullDocumentHeight - sliceStartMm);
        const sourceSliceHeight = Math.min(contentHeight - sourceY, contentHeight * (remainingHeight / fullDocumentHeight));

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.max(1, Math.round(sourceSliceHeight));
        const context = pageCanvas.getContext('2d');

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sourceSliceHeight, 0, 0, canvas.width, sourceSliceHeight);

        const imageData = pageCanvas.toDataURL('image/png');
        const imageProps = pdf.getImageProperties(imageData);
        const imageWidth = printableWidth;
        const imageHeight = (imageProps.height * imageWidth) / imageProps.width;

        pdf.addImage(imageData, 'PNG', margin, margin, imageWidth, Math.min(imageHeight, printableHeight));
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed', error);
      setPdfError('Unable to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderContactField = (label, value, fieldName) => (
    <label key={fieldName} className="field-label">
      <span>{label}</span>
      <input value={value || ''} onChange={(event) => updateField(fieldName, event.target.value)} placeholder={label} />
    </label>
  );

  return (
    <div className="page-section resume-page">
      <div className="panel-card">
        <div className="panel-heading inline-heading">
          <h3>Resume Builder</h3>
          <div className="toolbar">
            <select value={template} onChange={(event) => updateField('template', event.target.value)} aria-label="Resume template">
              <option value="Modern">Modern</option>
              <option value="Professional">Professional</option>
              <option value="Minimal">Minimal</option>
            </select>
          </div>
        </div>

        <div className="resume-layout">
          <div className="resume-editor">
            <div className="resume-header-actions">
              <button type="button" className="secondary-btn" onClick={() => generateAiText('summary')}>Improve Summary</button>
              <button type="button" className="secondary-btn" onClick={() => generateAiText('bullet')}>Improve Bullet</button>
              <button type="button" className="secondary-btn" onClick={() => generateAiText('bullets')}>Generate Bullet Points</button>
              <button type="button" className="secondary-btn" onClick={() => generateAiText('ats')}>Optimize for ATS</button>
            </div>

            <div className="info-banner">{aiNotice}</div>

            <div className="form-grid two-cols">
              {renderContactField('Full name', normalizedResume.fullName, 'fullName')}
              {renderContactField('Professional title', normalizedResume.professionalTitle, 'professionalTitle')}
              {renderContactField('Email', normalizedResume.email, 'email')}
              {renderContactField('Phone', normalizedResume.phone, 'phone')}
              {renderContactField('Location', normalizedResume.location, 'location')}
              {renderContactField('LinkedIn', normalizedResume.linkedin, 'linkedin')}
              {renderContactField('GitHub', normalizedResume.github, 'github')}
              {renderContactField('Portfolio', normalizedResume.portfolio, 'portfolio')}
            </div>

            <label className="field-label">
              <span>Professional summary</span>
              <textarea rows="5" value={normalizedResume.summary || ''} onChange={(event) => updateField('summary', event.target.value)} placeholder="Summarize your value proposition and strengths..." />
            </label>

            <div className="resume-section-block">
              <div className="section-header-row">
                <h4>Work experience</h4>
                <button type="button" className="secondary-btn small-btn" onClick={() => pushNewItem('experience', createExperienceItem)}>Add experience</button>
              </div>
              {normalizedResume.experience.map((entry, index) => (
                <div key={entry.id || index} className="resume-array-card">
                  <div className="array-row-controls">
                    <button type="button" className="small-btn ghost-btn" onClick={() => moveItem('experience', index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" className="small-btn ghost-btn" onClick={() => moveItem('experience', index, 1)} disabled={index === normalizedResume.experience.length - 1}>↓</button>
                    <button type="button" className="small-btn danger-btn" onClick={() => removeItem('experience', index)}>Remove</button>
                  </div>
                  <div className="form-grid two-cols">
                    <label className="field-label"><span>Company</span><input value={entry.company || ''} onChange={(event) => updateNestedField('experience', index, 'company', event.target.value)} /></label>
                    <label className="field-label"><span>Position</span><input value={entry.position || ''} onChange={(event) => updateNestedField('experience', index, 'position', event.target.value)} /></label>
                    <label className="field-label"><span>Location</span><input value={entry.location || ''} onChange={(event) => updateNestedField('experience', index, 'location', event.target.value)} /></label>
                    <label className="field-label"><span>Start</span><input value={entry.startDate || ''} onChange={(event) => updateNestedField('experience', index, 'startDate', event.target.value)} placeholder="2022" /></label>
                    <label className="field-label"><span>End</span><input value={entry.endDate || ''} onChange={(event) => updateNestedField('experience', index, 'endDate', event.target.value)} placeholder="Present" /></label>
                    <label className="field-label checkbox-inline"><input type="checkbox" checked={Boolean(entry.current)} onChange={(event) => updateNestedField('experience', index, 'current', event.target.checked)} /><span>Current role</span></label>
                  </div>
                  <div className="bullet-block">
                    <strong>Impact bullets</strong>
                    {(entry.bullets || ['']).map((bullet, bulletIndex) => (
                      <div key={`${entry.id || index}-bullet-${bulletIndex}`} className="bullet-editor-row">
                        <textarea rows="2" value={bullet} onChange={(event) => updateListField('experience', index, bulletIndex, event.target.value)} placeholder="Describe impact with metrics or outcomes" />
                        <button type="button" className="small-btn ghost-btn" onClick={() => removeListEntry('experience', index, bulletIndex)} disabled={(entry.bullets || []).length <= 1}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="small-btn secondary-btn" onClick={() => addListEntry('experience', index)}>Add bullet</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="resume-section-block">
              <div className="section-header-row">
                <h4>Education</h4>
                <button type="button" className="secondary-btn small-btn" onClick={() => pushNewItem('education', createEducationItem)}>Add education</button>
              </div>
              {normalizedResume.education.map((entry, index) => (
                <div key={entry.id || index} className="resume-array-card">
                  <div className="array-row-controls">
                    <button type="button" className="small-btn ghost-btn" onClick={() => moveItem('education', index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" className="small-btn ghost-btn" onClick={() => moveItem('education', index, 1)} disabled={index === normalizedResume.education.length - 1}>↓</button>
                    <button type="button" className="small-btn danger-btn" onClick={() => removeItem('education', index)}>Remove</button>
                  </div>
                  <div className="form-grid two-cols">
                    <label className="field-label"><span>Institution</span><input value={entry.institution || ''} onChange={(event) => updateNestedField('education', index, 'institution', event.target.value)} /></label>
                    <label className="field-label"><span>Degree</span><input value={entry.degree || ''} onChange={(event) => updateNestedField('education', index, 'degree', event.target.value)} /></label>
                    <label className="field-label"><span>Field of study</span><input value={entry.fieldOfStudy || ''} onChange={(event) => updateNestedField('education', index, 'fieldOfStudy', event.target.value)} /></label>
                    <label className="field-label"><span>Location</span><input value={entry.location || ''} onChange={(event) => updateNestedField('education', index, 'location', event.target.value)} /></label>
                    <label className="field-label"><span>Start</span><input value={entry.startDate || ''} onChange={(event) => updateNestedField('education', index, 'startDate', event.target.value)} /></label>
                    <label className="field-label"><span>End</span><input value={entry.endDate || ''} onChange={(event) => updateNestedField('education', index, 'endDate', event.target.value)} /></label>
                    <label className="field-label full-span"><span>GPA (optional)</span><input value={entry.gpa || ''} onChange={(event) => updateNestedField('education', index, 'gpa', event.target.value)} /></label>
                  </div>
                </div>
              ))}
            </div>

            <div className="resume-section-block">
              <div className="section-header-row">
                <h4>Skills</h4>
              </div>
              <textarea rows="3" value={normalizedResume.skills.join(', ')} onChange={(event) => updateField('skills', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="List key skills separated by commas" />
            </div>

            <div className="resume-section-block">
              <div className="section-header-row">
                <h4>Projects</h4>
                <button type="button" className="secondary-btn small-btn" onClick={() => pushNewItem('projects', createProjectItem)}>Add project</button>
              </div>
              {normalizedResume.projects.map((entry, index) => (
                <div key={entry.id || index} className="resume-array-card">
                  <div className="array-row-controls">
                    <button type="button" className="small-btn ghost-btn" onClick={() => moveItem('projects', index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" className="small-btn ghost-btn" onClick={() => moveItem('projects', index, 1)} disabled={index === normalizedResume.projects.length - 1}>↓</button>
                    <button type="button" className="small-btn danger-btn" onClick={() => removeItem('projects', index)}>Remove</button>
                  </div>
                  <div className="form-grid two-cols">
                    <label className="field-label"><span>Project name</span><input value={entry.name || ''} onChange={(event) => updateNestedField('projects', index, 'name', event.target.value)} /></label>
                    <label className="field-label"><span>URL</span><input value={entry.url || ''} onChange={(event) => updateNestedField('projects', index, 'url', event.target.value)} /></label>
                    <label className="field-label full-span"><span>Description</span><textarea rows="3" value={entry.description || ''} onChange={(event) => updateNestedField('projects', index, 'description', event.target.value)} /></label>
                    <label className="field-label full-span"><span>Technologies</span><input value={entry.technologies || ''} onChange={(event) => updateNestedField('projects', index, 'technologies', event.target.value)} /></label>
                  </div>
                </div>
              ))}
            </div>

            <div className="resume-section-block">
              <div className="section-header-row">
                <h4>Additional sections</h4>
              </div>
              <label className="field-label">
                <span>Certifications</span>
                <textarea rows="2" value={normalizedResume.certifications.join('\n')} onChange={(event) => updateField('certifications', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} placeholder="Add certifications or credentials" />
              </label>
              <label className="field-label">
                <span>Achievements</span>
                <textarea rows="2" value={normalizedResume.achievements.join('\n')} onChange={(event) => updateField('achievements', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} placeholder="Highlight measurable wins" />
              </label>
              <label className="field-label">
                <span>Languages</span>
                <textarea rows="2" value={normalizedResume.languages.join(', ')} onChange={(event) => updateField('languages', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="English, Spanish" />
              </label>
            </div>

            <div className="resume-actions">
              <button type="button" className="primary-btn" onClick={() => saveResume(true)}>Save Resume</button>
              <button type="button" className="secondary-btn" onClick={handlePrint}>Print</button>
              <button type="button" className="secondary-btn" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</button>
            </div>

            {pdfError && <div className="error-box" role="alert">{pdfError}</div>}
            {saveStatus && <div className="info-box" role="status">{saveStatus}</div>}
            {warnings.length > 0 && (
              <div className="warnings-box" role="alert">
                <strong>Resume quality checks</strong>
                <ul>
                  {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="resume-preview-panel">
            <div ref={resumeRef} className={`resume-template ${template.toLowerCase()}`}>
              <header className="resume-header-block">
                <h3>{normalizedResume.fullName || 'Your Name'}</h3>
                <p>{normalizedResume.professionalTitle || 'Professional Title'}</p>
                <div className="resume-meta-row">
                  {normalizedResume.email && <span>{normalizedResume.email}</span>}
                  {normalizedResume.phone && <span>{normalizedResume.phone}</span>}
                  {normalizedResume.location && <span>{normalizedResume.location}</span>}
                </div>
                <div className="resume-meta-row">
                  {normalizedResume.linkedin && <span>{normalizedResume.linkedin}</span>}
                  {normalizedResume.github && <span>{normalizedResume.github}</span>}
                  {normalizedResume.portfolio && <span>{normalizedResume.portfolio}</span>}
                </div>
              </header>

              {normalizedResume.summary && (
                <section>
                  <h4>Professional Summary</h4>
                  <p>{normalizedResume.summary}</p>
                </section>
              )}

              {normalizedResume.experience?.some((item) => item.company || item.position || item.bullets?.some(Boolean)) && (
                <section>
                  <h4>Experience</h4>
                  {normalizedResume.experience.map((entry, index) => (
                    <div key={entry.id || index} className="resume-entry">
                      <div className="entry-header-row">
                        <strong>{entry.position || 'Role'}</strong>
                        <span>{entry.current ? 'Current' : entry.endDate || 'Past'}</span>
                      </div>
                      <div className="entry-meta-row">
                        <span>{entry.company || 'Company'}</span>
                        <span>{entry.location || ''}</span>
                        <span>{entry.startDate || ''}{entry.startDate && entry.endDate ? ' - ' : ''}{entry.endDate || ''}</span>
                      </div>
                      <ul>
                        {(entry.bullets || ['']).filter((bullet) => bullet && bullet.trim()).map((bullet, bulletIndex) => <li key={`${entry.id || index}-bullet-${bulletIndex}`}>{bullet}</li>)}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {normalizedResume.education?.some((item) => item.institution || item.degree) && (
                <section>
                  <h4>Education</h4>
                  {normalizedResume.education.map((entry, index) => (
                    <div key={entry.id || index} className="resume-entry">
                      <div className="entry-header-row">
                        <strong>{entry.degree || 'Degree'}{entry.fieldOfStudy ? `, ${entry.fieldOfStudy}` : ''}</strong>
                        {entry.gpa && <span>GPA: {entry.gpa}</span>}
                      </div>
                      <div className="entry-meta-row">
                        <span>{entry.institution || 'Institution'}</span>
                        <span>{entry.location || ''}</span>
                        <span>{entry.startDate || ''}{entry.startDate && entry.endDate ? ' - ' : ''}{entry.endDate || ''}</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {normalizedResume.skills?.length > 0 && (
                <section>
                  <h4>Skills</h4>
                  <div className="tag-group">{normalizedResume.skills.map((skill) => <span key={skill} className="tag">{skill}</span>)}</div>
                </section>
              )}

              {normalizedResume.projects?.some((item) => item.name || item.description) && (
                <section>
                  <h4>Projects</h4>
                  {normalizedResume.projects.map((project, index) => (
                    <div key={project.id || index} className="resume-entry">
                      <div className="entry-header-row">
                        <strong>{project.name || 'Project'}</strong>
                        {project.url && <a href={project.url} target="_blank" rel="noreferrer">Link</a>}
                      </div>
                      <p>{project.description || ''}</p>
                      {project.technologies && <div className="entry-meta-row"><span>{project.technologies}</span></div>}
                    </div>
                  ))}
                </section>
              )}

              {normalizedResume.certifications?.length > 0 && (
                <section>
                  <h4>Certifications</h4>
                  <ul>{normalizedResume.certifications.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              )}

              {normalizedResume.achievements?.length > 0 && (
                <section>
                  <h4>Achievements</h4>
                  <ul>{normalizedResume.achievements.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              )}

              {normalizedResume.languages?.length > 0 && (
                <section>
                  <h4>Languages</h4>
                  <p>{normalizedResume.languages.join(', ')}</p>
                </section>
              )}
            </div>

            <div className="resume-ats-panel">
              <div className="panel-heading inline-heading"><h4>ATS readiness</h4><span className="score-badge">{atsBreakdown.overall}/100</span></div>
              <div className="score-list">
                {atsBreakdown.checks.map((check) => (
                  <div key={check.label}>
                    <span>{check.label}</span>
                    <strong>{check.score}/100</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumeMatchingPage({ auth, jobs, resume }) {
  const [jobId, setJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const readResumeFile = async (event) => {
    const file = event.target.files?.[0];
    setResumeFile(file || null);
    if (!file) return;
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) setResumeText(await file.text());
    else setError('PDF/DOCX files can be analyzed in ATS Checker; paste their text here for Resume Match.');
  };

  const analyzeMatch = async () => {
    if (!jobId && !jobDescription.trim()) return setError('Select a saved job or paste a job description first.');
    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      if (jobId) body.append('jobId', jobId);
      body.append('jobDescription', jobDescription);
      body.append('resumeText', resumeText || (resume ? JSON.stringify(resume) : ''));
      body.append('jobTitle', 'Target opportunity');
      if (resumeFile) body.append('resume', resumeFile);
      const response = await fetch('http://localhost:5001/api/resume/match', { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to match your resume.');
      setMatch(data.match);
    } catch (matchError) {
      setError(matchError.message || 'Unable to match your resume.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="page-section"><div className="panel-card">
    <div className="panel-heading"><div><h3>Resume-to-job matching</h3><p className="panel-subtitle">Compare your saved resume with a tracked opportunity before you apply.</p></div><Link to="/resume" className="secondary-btn small-btn">Edit resume</Link></div>
    <div className="form-grid two-cols"><label className="field-label"><span>Tracked job (optional)</span><select value={jobId} onChange={(event) => { setJobId(event.target.value); setMatch(null); }}>{jobs.length ? <><option value="">Use pasted description</option>{jobs.map((job) => <option key={job._id || job.id} value={job._id || job.id}>{job.title} · {job.company}</option>)}</> : <option value="">No tracked jobs</option>}</select></label><label className="field-label"><span>Resume file (optional)</span><input type="file" accept=".txt,.pdf,.docx" onChange={readResumeFile} /><small>{resumeFile ? resumeFile.name : 'TXT files are read here; paste PDF/DOCX text below.'}</small></label><label className="field-label"><span>Resume text</span><textarea rows="6" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder={resume ? `Saved resume: ${resume.fullName || 'current resume'} (${resume.skills?.length || 0} skills)` : 'Paste resume text'} /></label><label className="field-label"><span>Job description</span><textarea rows="6" value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setJobId(''); }} placeholder="Paste the target job description, required skills, and qualifications" /></label></div>
    <div className="form-actions"><button className="primary-btn" type="button" onClick={analyzeMatch} disabled={loading}>{loading ? 'Matching resume...' : 'Analyze Match'}</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {match && <div className="ats-results" style={{ marginTop: '20px' }}><div className="ats-summary"><div className="score-ring" style={{ background: `conic-gradient(#4f46e5 ${match.matchPercentage}%, #e5e7eb ${match.matchPercentage}% 100%)` }}><div><strong>{match.matchPercentage}</strong><span>%</span></div></div><div><span className="result-kicker">{match.job.title} · {match.job.company}</span><h4>Application fit</h4><p>{match.matchingSkills.length} matching skills and {match.missingSkills.length} gaps identified.</p></div></div><div className="ats-result-columns"><div className="result-block"><h4>Matching skills</h4><div className="tag-group">{match.matchingSkills.length ? match.matchingSkills.map((skill) => <span className="tag" key={skill}>{skill}</span>) : <span className="muted-copy">None found</span>}</div></div><div className="result-block"><h4>Missing skills</h4><div className="tag-group">{match.missingSkills.length ? match.missingSkills.map((skill) => <span className="tag warning-tag" key={skill}>{skill}</span>) : <span className="muted-copy">None found</span>}</div></div><div className="result-block"><h4>Keywords found</h4><div className="tag-group">{match.matchedKeywords.map((keyword) => <span className="tag" key={keyword}>{keyword}</span>)}</div></div><div className="result-block"><h4>Missing qualifications</h4>{match.missingQualifications?.length ? match.missingQualifications.map((item) => <p key={item}>• {item}</p>) : <p className="muted-copy">No missing qualifications detected.</p>}</div><div className="result-block"><h4>Resume improvement suggestions</h4>{match.suggestions.length ? match.suggestions.map((suggestion) => <p key={suggestion}>• {suggestion}</p>) : <p className="muted-copy">Your resume covers the main requirements.</p>}</div></div></div>}
  </div></div>;
}

function ATSCheckerPage({ auth }) {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setResumeText(''); setJobDescription(''); setJobTitle(''); setFile(null); setResult(null); setError('');
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setError('');
    if (!nextFile) return setFile(null);
    if (nextFile.size > 8 * 1024 * 1024) return setError('Resume files must be 8 MB or smaller.');
    if (!/\.(pdf|docx)$/i.test(nextFile.name)) return setError('Only PDF and DOCX files are supported.');
    setFile(nextFile); setResumeText('');
  };

  const analyzeResume = async (event) => {
    event.preventDefault();
    if (!file && !resumeText.trim()) return setError('Upload a PDF or DOCX file, or paste your resume text.');
    setIsAnalyzing(true); setError('');
    try {
      const body = new FormData();
      if (file) body.append('resume', file); else body.append('resumeText', resumeText.trim());
      body.append('jobDescription', jobDescription.trim()); body.append('jobTitle', jobTitle.trim());
      const response = await fetch('http://localhost:5001/api/ats/analyze', { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to analyze this resume.');
      setResult(payload.data || payload.analysis);
    } catch (analysisError) {
      setError(analysisError.message || 'Unable to analyze this resume.');
    } finally { setIsAnalyzing(false); }
  };

  const categoryLabels = { keywordMatch: 'Keyword match', skillsMatch: 'Skills match', structure: 'Resume structure', experienceQuality: 'Experience quality', contactInformation: 'Contact information', educationAndCertifications: 'Education and certifications' };
  const tags = (items, className = 'tag') => items?.length ? items.map((item) => <span className={className} key={typeof item === 'string' ? item : item.name}>{typeof item === 'string' ? item : item.name}</span>) : <p className="muted-copy">None detected.</p>;
  const suggestions = (result?.suggestions || []).map((item) => typeof item === 'string' ? { priority: 'Review', issue: item, explanation: item, suggestedImprovement: item } : item);

  return (
    <div className="page-section"><div className="panel-card ats-checker-panel">
      <div className="panel-heading"><div><h3>ATS Resume Checker</h3><p className="panel-subtitle">Evidence-based feedback. This score does not guarantee an interview.</p></div><button className="secondary-btn" type="button" onClick={reset}>Reset</button></div>
      <form className="ats-checker-form" onSubmit={analyzeResume}><div className="ats-input-grid">
        <div className="ats-input-column"><label className="field-label"><span>Resume file</span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} /><small>PDF or DOCX, up to 8 MB{file ? ` • ${file.name}` : ''}</small></label><label className="field-label"><span>Or paste resume text</span><textarea rows="12" value={resumeText} onChange={(event) => { setResumeText(event.target.value); setFile(null); }} placeholder="Paste the resume content here..." /></label></div>
        <div className="ats-input-column"><label className="field-label"><span>Target job title <em>(optional)</em></span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Full Stack Developer" /></label><label className="field-label"><span>Job description <em>(optional)</em></span><textarea rows="12" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste a job description for job-specific matching, or leave blank for general analysis." /></label></div>
      </div>{error && <p className="form-error" role="alert">{error}</p>}<div className="resume-actions"><button className="primary-btn" type="submit" disabled={isAnalyzing}>{isAnalyzing ? 'Analyzing your resume...' : 'Analyze Resume'}</button></div></form>
      {result && <div className="ats-results" aria-live="polite"><div className="ats-summary"><div className="score-ring" style={{ background: `conic-gradient(#4f46e5 ${result.overallScore}%, #e5e7eb ${result.overallScore}% 100%)` }}><div><strong>{result.overallScore}</strong><span>/100</span></div></div><div><span className="result-kicker">{result.analysisType || (result.jobDescription ? 'Job-specific compatibility analysis' : 'General resume analysis')}</span><h4>ATS compatibility</h4><p>Scores reflect extracted resume text and the optional job description.</p></div></div>
        <div className="ats-score-breakdown"><h4>Score breakdown</h4><div className="score-list">{Object.entries(result.categoryScores || {}).map(([key, score]) => <div key={key}><span>{categoryLabels[key] || key}</span><strong>{score}/100</strong></div>)}</div><p className="methodology-note">Weights: keywords 30%, skills 20%, structure 15%, experience 15%, contact 10%, education and certifications 10%.</p></div>
        <div className="ats-result-columns"><div className="result-block"><h4>Matched keywords</h4><div className="tag-group">{tags(result.matchedKeywords)}</div></div><div className="result-block"><h4>Missing keywords</h4><div className="tag-group">{tags(result.missingKeywords, 'tag warning-tag')}</div></div><div className="result-block"><h4>Detected skills</h4><div className="tag-group">{tags(result.detectedSkills)}</div></div><div className="result-block"><h4>Resume sections</h4><div className="tag-group">{tags(result.detectedSections)}</div></div></div>
        <div className="ats-feedback-grid"><div className="result-block"><h4>Strengths</h4>{result.strengths?.length ? result.strengths.map((item) => <p key={item}>• {item}</p>) : <p className="muted-copy">No specific strengths detected yet.</p>}</div><div className="result-block"><h4>Potential issues and suggestions</h4>{suggestions.length ? suggestions.map((item) => <div className="suggestion-item" key={`${item.priority}-${item.issue}`}><strong>{item.priority}: {item.issue}</strong><p>{item.explanation}</p><small>Suggested improvement: {item.suggestedImprovement}</small></div>) : <p className="muted-copy">No priority issues detected.</p>}</div></div>
      </div>}
    </div></div>
  );
}

function AIEnhancementPage() {
  const [form, setForm] = useState({ content: defaultResume.summary, jobTitle: 'Senior Product Designer', jobDescription: 'Seeking a product designer with strong UX, prototyping, accessibility, and cross-functional collaboration.' });
  const [improved, setImproved] = useState('');
  const [keywords, setKeywords] = useState(['UX', 'Design systems', 'Prototyping', 'Accessibility']);

  const enhanceResume = () => {
    setImproved(`Product-focused professional with 5+ years of experience delivering customer-centered design systems and measurable business results. Skilled in UX strategy, prototyping, cross-functional collaboration, and accessible product experiences for complex software teams.`);
    setKeywords(['UX design', 'Accessibility', 'Design systems', 'Data-informed decisions', 'User research']);
  };

  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading"><h3>AI Resume Enhancement</h3></div>
        <div className="ai-layout">
          <div className="ai-form">
            <textarea rows="8" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <div className="form-grid two-cols">
              <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Target job title" />
              <input value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} placeholder="Target job description" />
            </div>
            <button className="primary-btn" onClick={enhanceResume}>Enhance Resume</button>
          </div>
          <div className="ai-result">
            <div className="result-block">
              <h4>AI Improved Content</h4>
              <p>{improved || 'Your enhanced summary will appear here.'}</p>
            </div>
            <div className="result-block">
              <h4>Suggested Keywords</h4>
              <div className="tag-group">{keywords.map((item) => <span key={item} className="tag">{item}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillsCheckPage() {
  const [jobTitle, setJobTitle] = useState('Frontend Engineer');
  const [skills, setSkills] = useState('React, JavaScript, CSS, Git');
  const [level, setLevel] = useState('Mid-level');

  const requiredSkills = ['React', 'JavaScript', 'TypeScript', 'Testing', 'Design systems'];
  const currentSkillList = skills.split(',').map((item) => item.trim()).filter(Boolean);
  const missingSkills = requiredSkills.filter((skill) => !currentSkillList.includes(skill));
  const matchPercent = Math.round((requiredSkills.filter((skill) => currentSkillList.includes(skill)).length / requiredSkills.length) * 100);

  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading"><h3>Skills Check</h3></div>
        <div className="skills-layout">
          <div className="skills-form">
            <div className="form-grid two-cols">
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Target job title" />
              <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Current skills" />
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>Entry-level</option>
                <option>Mid-level</option>
                <option>Senior</option>
              </select>
            </div>
          </div>
          <div className="skills-result">
            <div className="score-ring skill-ring" style={{ background: `conic-gradient(#8b5cf6 ${matchPercent}%, #e5e7eb ${matchPercent}% 100%)` }}>
              <div><strong>{matchPercent}%</strong><span>match</span></div>
            </div>
            <div className="score-list">
              <div><span>Required skills</span><strong>{requiredSkills.length}</strong></div>
              <div><span>Current skills</span><strong>{currentSkillList.length}</strong></div>
              <div><span>Missing skills</span><strong>{missingSkills.length}</strong></div>
            </div>
          </div>
        </div>
        <div className="skills-grid">
          <div className="result-block"><h4>Current skills</h4><p>{currentSkillList.join(', ')}</p></div>
          <div className="result-block"><h4>Missing skills</h4><p>{missingSkills.length ? missingSkills.join(', ') : 'None'}</p></div>
          <div className="result-block"><h4>Recommended skills</h4><p>{['TypeScript', 'Testing', 'Design systems'].join(', ')}</p></div>
        </div>
      </div>
    </div>
  );
}

function InterviewPage({ auth }) {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ totalQuestions: 0, answeredQuestions: 0, savedQuestions: 0, practiceSessions: 0, averageScore: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [role, setRole] = useState('All');
  const [expanded, setExpanded] = useState({});
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [mockSetup, setMockSetup] = useState(false);
  const [mockCategory, setMockCategory] = useState('Technical');
  const [mockDifficulty, setMockDifficulty] = useState('Medium');
  const [mockRole, setMockRole] = useState('All');
  const [mockCount, setMockCount] = useState(5);
  const [mockMessage, setMockMessage] = useState('');
  const [mockQueue, setMockQueue] = useState([]);
  const [mockIndex, setMockIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuestions = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ search, category, difficulty, role });
      const response = await fetch(`http://localhost:5001/api/interview?${params}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load interview questions.');
      setQuestions(data.questions || []); setStats(data.stats || stats);
      const historyResponse = await fetch('http://localhost:5001/api/interview/history', { headers: { Authorization: `Bearer ${auth.token}` } });
      if (historyResponse.ok) setHistory((await historyResponse.json()).history || []);
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadQuestions(); }, [auth?.token, search, category, difficulty, role]);

  const toggleSave = async (question) => {
    try {
      const response = await fetch(`http://localhost:5001/api/interview/saved${question.saved ? `/${question.id}` : ''}`, { method: question.saved ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: question.saved ? undefined : JSON.stringify({ questionId: question.id }) });
      if (!response.ok) throw new Error('Unable to update saved questions.');
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, saved: !question.saved } : item));
      setStats((current) => ({ ...current, savedQuestions: Math.max(0, current.savedQuestions + (question.saved ? -1 : 1)) }));
    } catch (saveError) { setError(saveError.message); }
  };

  const startPractice = (question) => { setPracticeQuestion(question); setAnswer(''); setFeedback(null); };
  const submitAnswer = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/api/interview/practice', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ questionId: practiceQuestion.id, answer }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to evaluate answer.');
      setFeedback(data.practice); setStats((current) => ({ ...current, answeredQuestions: current.answeredQuestions + 1, practiceSessions: current.practiceSessions + 1, averageScore: current.practiceSessions ? Math.round((current.averageScore * current.practiceSessions + data.practice.score) / (current.practiceSessions + 1)) : data.practice.score }));
      await loadQuestions();
    } catch (submitError) { setError(submitError.message); }
  };

  const progress = (categoryName) => { const total = questions.filter((question) => question.category === categoryName).length; const answered = questions.filter((question) => question.category === categoryName && question.answered).length; return total ? Math.round(answered / total * 100) : 0; };
  const metricCards = [['Questions available', stats.totalQuestions], ['Questions answered', stats.answeredQuestions], ['Saved questions', stats.savedQuestions], ['Practice sessions', stats.practiceSessions], ['Average score', `${stats.averageScore}/100`]];
  const visibleQuestions = savedOnly ? questions.filter((question) => question.saved) : questions;
  const beginMock = async () => {
    setError(''); setMockMessage('');
    try {
      const params = new URLSearchParams({ category: mockCategory, difficulty: mockDifficulty, role: mockRole });
      const response = await fetch(`http://localhost:5001/api/interview/mock?${params}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to build this mock interview.');
      if (!data.questions?.length) { setError(data.fallbackMessage || 'No questions are available for this interview type yet.'); return; }
      setMockMessage(data.fallbackMessage || 'Exact questions found for your selected mock interview.');
      const selectedQuestions = data.questions.slice(0, Math.max(1, Number(mockCount) || 1));
      setMockQueue(selectedQuestions); setMockIndex(0); setMockSetup(false); startPractice(selectedQuestions[0]);
    } catch (mockError) { setError(mockError.message || 'Unable to build this mock interview.'); }
  };
  const nextMockQuestion = () => {
    const nextIndex = mockIndex + 1;
    if (nextIndex >= mockQueue.length) {
      setPracticeQuestion(null); setMockQueue([]); setMockMessage('Mock interview complete. Review your practice feedback and continue with another session when ready.');
      return;
    }
    setMockIndex(nextIndex); startPractice(mockQueue[nextIndex]);
  };

  return <div className="page-section interview-page"><div className="panel-card interview-panel">
    <div className="interview-page-header"><div><span className="eyebrow">INTERVIEW PREP</span><h2>Welcome back, {auth?.user?.name?.split(' ')[0] || 'there'} <span aria-hidden="true">👋</span></h2><p className="panel-subtitle">Practice smarter. Build confidence. Land your dream job.</p></div><div className="interview-header-actions"><button className="secondary-btn" type="button" onClick={() => setShowDetailedStats((current) => !current)}>View Detailed Statistics</button><button className="primary-btn" type="button" onClick={() => setMockSetup((current) => !current)}>Start Mock Interview</button></div></div>
    <div className="interview-hero"><div><span className="result-kicker">YOUR NEXT OPPORTUNITY</span><h1>Turn preparation into opportunity</h1><p>Practice real interview questions, track your progress, and get structured feedback to improve with every session.</p><div className="interview-hero-actions"><button className="primary-btn" type="button" onClick={() => setMockSetup(true)}>Start Mock Interview</button><button className="secondary-btn" type="button" onClick={() => { setShowDetailedStats(true); window.setTimeout(() => document.getElementById('interview-tips')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>Learn Interview Tips</button></div></div><div className="interview-hero-art" aria-hidden="true"><div className="hero-art-ring">AI</div><div className="hero-art-line" /></div></div>
    <div className="interview-metrics">{[['Questions Available', stats.totalQuestions, 'Curated question bank', MessageSquareText], ['Questions Answered', stats.answeredQuestions, `${stats.totalQuestions ? Math.round(stats.answeredQuestions / stats.totalQuestions * 100) : 0}% completed`, CheckCircle2], ['Saved Questions', stats.savedQuestions, stats.savedQuestions ? 'Ready for later' : 'Save for later', Star], ['Practice Sessions', stats.practiceSessions, stats.practiceSessions ? 'Keep building consistency' : 'Start your first session', TrendingUp], ['Average Score', `${stats.averageScore}/100`, stats.practiceSessions ? 'Based on your attempts' : 'No score yet', Gauge]].map(([label, value, support, Icon]) => <div className="metric-card interview-stat-card" key={label}><div className="metric-icon"><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{support}</small></div>)}</div>
    <div className="interview-progress"><div className="panel-heading"><div><h3>Preparation progress</h3><p className="panel-subtitle">Progress is calculated from your completed practice attempts.</p></div><button className="secondary-btn small-btn" type="button" onClick={() => setShowDetailedStats(true)}>View details</button></div><div className="progress-grid">{['HR', 'Technical', 'Behavioral', 'Situational'].map((item) => { const progressData = stats.categoryProgress?.[item] || { percentage: 0, answered: 0, total: 0 }; return <div className="progress-card" key={item}><div className="progress-label"><span>{item}</span><strong>{progressData.percentage}%</strong></div><div className="progress-track"><span style={{ width: `${progressData.percentage}%` }} /></div><small>{progressData.answered} of {progressData.total} answered</small></div>; })}</div>{!stats.answeredQuestions && <p className="empty-state">Start practicing to track your progress.</p>}</div>
    {showDetailedStats && <div className="interview-detail-grid"><div className="result-block"><h4>Practice history</h4>{history.length ? history.slice(0, 6).map((item) => <div className="history-row" key={item.id}><span>{item.category}</span><strong>{item.score}/100</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div>) : <p className="muted-copy">No completed practice sessions yet.</p>}{history[0]?.strengths?.length > 0 && <><h4>Recent strengths</h4><p className="muted-copy">{history[0].strengths.join(' ')}</p></>}{history[0]?.improvements?.length > 0 && <><h4>Recent improvement areas</h4><p className="muted-copy">{history[0].improvements.join(' ')}</p></>}</div><div className="result-block" id="interview-tips"><h4>Interview tips</h4><p>Use real examples, explain your reasoning, and close with a clear outcome. For behavioral answers, organize your response with Situation, Task, Action, and Result.</p><Link to="/career" className="secondary-btn small-btn">Open Career Guidance</Link></div></div>}
    {mockSetup && <div className="mock-setup"><h4>Configure mock interview</h4><div className="form-grid two-cols"><label className="field-label"><span>Interview type</span><select value={mockCategory} onChange={(event) => setMockCategory(event.target.value)}><option>HR</option><option>Behavioral</option><option>Technical</option><option>Situational</option></select></label><label className="field-label"><span>Difficulty</span><select value={mockDifficulty} onChange={(event) => setMockDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label className="field-label"><span>Target role</span><select value={mockRole} onChange={(event) => setMockRole(event.target.value)}><option>All</option><option>Frontend Developer</option><option>Backend Developer</option><option>Full Stack Developer</option><option>Data Analyst</option><option>Software Engineer</option></select></label><label className="field-label"><span>Number of questions</span><select value={mockCount} onChange={(event) => setMockCount(event.target.value)}><option value="1">1</option><option value="3">3</option><option value="5">5</option><option value="10">10</option></select></label></div><button className="primary-btn" type="button" onClick={beginMock}>Begin interview</button></div>}
    {mockMessage && <p className="info-box" role="status">{mockMessage}</p>}
    <div className="panel-heading inline-heading question-browser-heading"><div><h3>{savedOnly ? 'Saved questions' : 'Question browser'}</h3><p className="panel-subtitle">Showing {visibleQuestions.length} question{visibleQuestions.length === 1 ? '' : 's'} from your curated library.</p></div><div className="toolbar"><button className="secondary-btn small-btn" type="button" onClick={() => setSavedOnly((current) => !current)}>{savedOnly ? 'Show all' : 'View saved'}</button><button className="secondary-btn small-btn" type="button" onClick={() => { setSearch(''); setCategory('All'); setDifficulty('All'); setRole('All'); setSavedOnly(false); }}>Reset Filters</button><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions, topics, or roles..." /></div><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="All">All Categories</option><option>HR</option><option>Behavioral</option><option>Technical</option><option>Situational</option></select><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="All">All Difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select><select value={role} onChange={(event) => setRole(event.target.value)}><option value="All">All Roles</option><option>Frontend Developer</option><option>Backend Developer</option><option>Full Stack Developer</option><option>Data Analyst</option><option>Software Engineer</option></select></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}{loading ? <div className="empty-state">Loading interview questions...</div> : !visibleQuestions.length ? <div className="empty-state">No questions found. Try changing your search or filters.</div> : <div className="question-grid">{visibleQuestions.map((question) => <article key={question.id} className="question-card"><div className="question-meta"><span>{question.category} · {question.subcategory}</span><span>{question.difficulty}</span></div><h4>{question.question}</h4><p className="question-role">{question.role}</p><div className="question-actions"><button className="secondary-btn small-btn" type="button" onClick={() => setExpanded((current) => ({ ...current, [question.id]: !current[question.id] }))}>{expanded[question.id] ? 'Hide Answer' : 'Show Answer'}</button><button className="small-btn ghost-btn" type="button" onClick={() => toggleSave(question)}>{question.saved ? 'Saved' : 'Save'}</button><button className="small-btn ghost-btn" type="button" onClick={() => startPractice(question)}>Practice</button></div>{expanded[question.id] && <div className="answer-box"><strong>Example answer</strong><p>{question.answer}</p><strong>Key points</strong><p>{question.keyPoints?.join(' • ')}</p><strong>Interview tips</strong><p>{question.tips?.join(' ')}</p></div>}</article>)}</div>}
    {practiceQuestion && <div className="practice-panel"><div className="panel-heading"><div><span className="result-kicker">{practiceQuestion.category} · {practiceQuestion.difficulty}</span><h3>Practice answer</h3>{mockQueue.length > 0 && <p>Question {mockIndex + 1} of {mockQueue.length}</p>}<p>{practiceQuestion.question}</p></div><button className="secondary-btn" type="button" onClick={() => { setPracticeQuestion(null); setMockQueue([]); }}>Exit</button></div>{!feedback ? <form className="practice-form" onSubmit={submitAnswer}><textarea rows="7" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer using real experience and specific evidence..." required /><button className="primary-btn" type="submit">Submit Answer</button></form> : <div className="feedback-grid"><div className="score-badge">{feedback.score}/100</div><div><h4>Overall feedback</h4><p>{feedback.overallFeedback}</p><h4>Strengths</h4>{feedback.strengths.map((item) => <p key={item}>• {item}</p>)}<h4>Areas for improvement</h4>{feedback.areasForImprovement.map((item) => <p key={item}>• {item}</p>)}<h4>Suggested follow-up</h4>{feedback.followUpQuestions.map((item) => <p key={item}>• {item}</p>)}</div><div className="practice-next-actions"><button className="secondary-btn" type="button" onClick={() => { setFeedback(null); setAnswer(''); }}>Try again</button>{mockQueue.length > 0 && <button className="primary-btn" type="button" onClick={nextMockQuestion}>{mockIndex + 1 < mockQueue.length ? 'Next question' : 'Finish interview'}</button>}</div></div>}</div>}
  </div></div>;
}

function CareerPage({ auth }) {
  const [overview, setOverview] = useState(null);
  const [profile, setProfile] = useState({});
  const [goal, setGoal] = useState({ skill: '', description: '', priority: 'Medium', targetDate: '' });
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantResult, setAssistantResult] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/career/overview', { headers: { Authorization: `Bearer ${auth.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load career guidance.');
      setOverview(data.data); setProfile(data.data.profile || {});
    } catch (error) { setStatus(error.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadOverview(); }, [auth?.token]);

  const saveProfile = async (event) => {
    event.preventDefault(); setStatus('');
    try {
      const response = await fetch('http://localhost:5001/api/career/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(profile) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to save career profile.');
      setStatus('Career profile saved.'); await loadOverview();
    } catch (error) { setStatus(error.message); }
  };

  const addGoal = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/api/career/learning-goals', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(goal) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to add learning goal.');
      setGoal({ skill: '', description: '', priority: 'Medium', targetDate: '' }); await loadOverview();
    } catch (error) { setStatus(error.message); }
  };

  const updateGoal = async (item, changes) => {
    await fetch(`http://localhost:5001/api/career/learning-goals/${item._id || item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(changes) });
    loadOverview();
  };

  const askAssistant = async (event) => {
    event.preventDefault();
    const response = await fetch('http://localhost:5001/api/career/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ question: assistantQuestion }) });
    const data = await response.json(); if (response.ok) setAssistantResult(data); else setStatus(data.message || 'Assistant unavailable.');
  };

  const setField = (field, value) => setProfile((current) => ({ ...current, [field]: value }));
  const split = (value) => Array.isArray(value) ? value.join(', ') : value || '';
  if (loading) return <div className="page-section"><div className="panel-card empty-state">Loading career guidance...</div></div>;
  if (!overview) return <div className="page-section"><div className="panel-card error-box">{status || 'Career guidance is unavailable.'}</div></div>;

  return <div className="page-section career-page"><div className="panel-card career-panel">
    <div className="panel-heading"><div><h3>Career Guidance</h3><p className="panel-subtitle">Personalized from your saved profile and JobTrack activity. Static role recommendations are clearly marked.</p></div></div>
    {status && <p className="info-box" role="status">{status}</p>}
    {!overview.hasProfile && <div className="info-box"><strong>Complete your career profile</strong><p>Set a target role to replace general guidance with role-specific skills and a roadmap.</p></div>}
    <div className="career-summary-grid"><div className="result-block"><span className="result-kicker">Target role</span><h4>{profile.targetRole || 'Not set'}</h4><p>{profile.experienceLevel || 'Experience level not set'}</p></div><div className="result-block"><span className="result-kicker">Current skills</span><h4>{overview.currentSkills.length}</h4><p>{overview.currentSkills.length ? overview.currentSkills.join(', ') : 'No skills provided yet.'}</p></div><div className="result-block"><span className="result-kicker">Career goal</span><h4>{profile.careerGoal || 'Not set'}</h4><p>{profile.weeklyLearningTime ? `${profile.weeklyLearningTime} hours/week available` : 'Learning time not set'}</p></div><div className="result-block"><span className="result-kicker">Progress</span><h4>{overview.stats.roadmapCompletion}%</h4><p>{overview.stats.completedGoals} completed learning goals</p></div></div>
    <section className="career-section"><div className="panel-heading"><h4>Career profile</h4></div><form className="career-form" onSubmit={saveProfile}><div className="form-grid two-cols"><label className="field-label"><span>Target role</span><select value={profile.targetRole || ''} onChange={(event) => setField('targetRole', event.target.value)}><option value="">Select a role</option><option>Frontend Developer</option><option>Backend Developer</option><option>Full Stack Developer</option><option>Data Analyst</option><option>Data Scientist</option><option>Software Engineer</option></select></label><label className="field-label"><span>Experience level</span><select value={profile.experienceLevel || ''} onChange={(event) => setField('experienceLevel', event.target.value)}><option value="">Select level</option><option>Beginner</option><option>Intermediate</option><option>Experienced</option><option>Student</option></select></label><label className="field-label"><span>Current role or student status</span><input value={profile.currentRole || ''} onChange={(event) => setField('currentRole', event.target.value)} placeholder="Student, career changer, developer" /></label><label className="field-label"><span>Education level</span><input value={profile.educationLevel || ''} onChange={(event) => setField('educationLevel', event.target.value)} placeholder="Degree or current education" /></label><label className="field-label"><span>Technical skills</span><input value={split(profile.technicalSkills)} onChange={(event) => setField('technicalSkills', event.target.value)} placeholder="React, SQL, Python" /></label><label className="field-label"><span>Soft skills</span><input value={split(profile.softSkills)} onChange={(event) => setField('softSkills', event.target.value)} placeholder="Communication, teamwork" /></label><label className="field-label"><span>Weekly learning time</span><input type="number" min="0" max="168" value={profile.weeklyLearningTime || ''} onChange={(event) => setField('weeklyLearningTime', event.target.value)} placeholder="Hours" /></label><label className="field-label"><span>Preferred industry/location</span><input value={profile.industry || ''} onChange={(event) => setField('industry', event.target.value)} placeholder="Industry or preferred location" /></label></div><label className="field-label"><span>Career goal</span><textarea rows="3" value={profile.careerGoal || ''} onChange={(event) => setField('careerGoal', event.target.value)} placeholder="What do you want to achieve?" /></label><button className="primary-btn" type="submit">Save career profile</button></form></section>
    <div className="career-content-grid"><section className="career-section"><div className="panel-heading"><h4>Personalized roadmap</h4></div>{overview.roadmap.length ? overview.roadmap.map((phase) => <div className="roadmap-phase" key={phase.phase}><strong>{phase.phase}</strong>{phase.items.map((item) => <p key={item}>• {item}</p>)}</div>) : <div className="empty-state">Set a target role to generate a roadmap.</div>}</section><section className="career-section"><div className="panel-heading"><h4>Skill gap analysis</h4></div>{overview.skillGaps.length ? overview.skillGaps.map((item) => <div className="skill-gap-row" key={item.skill}><div><strong>{item.skill}</strong><p>{item.whyItMatters}</p></div><span className={`status-pill ${item.status === 'Known' ? 'skill-known' : 'skill-recommended'}`}>{item.status}</span></div>) : <div className="empty-state">Set a target role to see role-specific skill guidance.</div>}</section></div>
    <section className="career-section"><div className="panel-heading"><h4>Learning goals</h4></div><form className="goal-form" onSubmit={addGoal}><input value={goal.skill} onChange={(event) => setGoal({ ...goal, skill: event.target.value })} placeholder="Skill or goal" required /><input value={goal.description} onChange={(event) => setGoal({ ...goal, description: event.target.value })} placeholder="What will you practice?" /><select value={goal.priority} onChange={(event) => setGoal({ ...goal, priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select><button className="secondary-btn" type="submit">Add goal</button></form>{overview.goals.length ? <div className="goal-list">{overview.goals.map((item) => <div className="goal-row" key={item._id}><div><strong>{item.skill}</strong><p>{item.description || 'No notes yet.'}</p></div><select value={item.status} onChange={(event) => updateGoal(item, { status: event.target.value, progress: event.target.value === 'Completed' ? 100 : item.progress })}><option>Not Started</option><option>In Progress</option><option>Completed</option></select><input aria-label={`${item.skill} progress`} type="number" min="0" max="100" value={item.progress} onChange={(event) => updateGoal(item, { progress: event.target.value })} /></div>)}</div> : <div className="empty-state">No learning goals yet.</div>}</section>
    <div className="career-content-grid"><section className="career-section"><div className="panel-heading"><h4>Next steps</h4></div>{overview.nextSteps.map((item) => <p key={item}>• {item}</p>)}<p>{overview.jobGuidance}</p><div className="career-links"><Link className="secondary-btn small-btn" to="/resume">Review resume</Link><Link className="secondary-btn small-btn" to="/ats">Check ATS</Link><Link className="secondary-btn small-btn" to="/interview">Practice interview</Link></div></section><section className="career-section"><div className="panel-heading"><h4>Career resources</h4></div>{overview.resources.map((resource) => <a className="resource-row" href={resource.link} target="_blank" rel="noreferrer" key={resource.title}><strong>{resource.title}</strong><span>{resource.description}</span></a>)}</section></div>
    <section className="career-section"><div className="panel-heading"><h4>Career assistant</h4></div><form className="assistant-form" onSubmit={askAssistant}><input value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="Ask about skills, projects, or interview preparation" required /><button className="primary-btn" type="submit">Ask</button></form>{assistantResult && <div className="info-box"><strong>{assistantResult.personalized ? 'Personalized guidance' : 'General guidance'}</strong><p>{assistantResult.answer}</p><small>{assistantResult.note}</small></div>}</section>
  </div></div>;
}

function AnalyticsPage({ auth }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5001/api/analytics', { headers: { Authorization: `Bearer ${auth.token}` } }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Unable to load analytics.'); setData(payload.analytics); }).catch((loadError) => setError(loadError.message));
  }, [auth?.token]);

  if (error) return <div className="page-section"><div className="panel-card error-box">{error}</div></div>;
  if (!data) return <div className="page-section"><div className="panel-card empty-state">Loading application analytics...</div></div>;
  const chartData = Object.entries(data.statusCounts).map(([name, value]) => ({ name, value }));
  const totals = [['Total applications', data.totals.total], ['Saved', data.totals.saved], ['Applied', data.totals.applied], ['Shortlisted', data.totals.shortlisted], ['Interviews', data.totals.interviews], ['Offers', data.totals.offers], ['Rejected', data.totals.rejected]];
  const statusOrder = ['Saved', 'Applied', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Accepted', 'Rejected'];
  return <div className="page-section analytics-page"><div className="dashboard-heading"><div><span className="eyebrow">APPLICATION INTELLIGENCE</span><h2>Analytics</h2><p className="panel-subtitle">Real counts from your saved jobs, applications, interviews, and outcomes.</p></div><Link to="/jobs" className="primary-btn">Manage applications</Link></div><div className="stats-grid">{totals.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="charts-grid"><div className="panel-card large-panel"><div className="panel-heading"><h3>Application funnel</h3></div><ResponsiveContainer width="100%" height={300}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="panel-card large-panel"><div className="panel-heading"><h3>Pipeline timeline</h3></div><div className="analytics-timeline">{data.applications.slice(0, 8).map((job) => <div className="timeline-item" key={job._id}><span className="timeline-dot" /><div><strong>{job.title}</strong><span>{job.company}</span><small>{(job.statusHistory || [{ status: job.status }]).map((entry) => entry.status).join(' → ')}</small></div><time>{job.status || 'Saved'}</time></div>)}</div>{!data.applications.length && <div className="empty-state">Add an application to see its status timeline.</div>}</div></div><div className="panel-card"><div className="panel-heading"><h3>Deadline reminders</h3><Link to="/jobs" className="text-button">Set deadlines in Jobs</Link></div><div className="deadline-columns">{[['Overdue', data.deadlines.overdue], ['Today', data.deadlines.today], ['Upcoming', data.deadlines.upcoming]].map(([label, items]) => <div className="deadline-group" key={label}><h4>{label} <span>{items.length}</span></h4>{items.length ? items.map((item) => <div className="list-row" key={String(item.id)}><div><strong>{item.title}</strong><span>{item.company}</span></div><time>{item.deadline}</time></div>) : <p className="muted-copy">None</p>}</div>)}</div></div></div>;
}

function CareerRoadmapPage({ auth }) {
  const [role, setRole] = useState('Software Engineer');
  const [roadmap, setRoadmap] = useState(null);
  const [error, setError] = useState('');
  const loadRoadmap = async (nextRole = role) => { try { const response = await fetch(`http://localhost:5001/api/career/roadmap?role=${encodeURIComponent(nextRole)}`, { headers: { Authorization: `Bearer ${auth.token}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load roadmap.'); setRoadmap(data); } catch (loadError) { setError(loadError.message); } };
  useEffect(() => { loadRoadmap(); }, [auth?.token]);
  const updateStatus = async (item, status) => { const response = await fetch(`http://localhost:5001/api/career/roadmap/${item._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ status }) }); if (response.ok) loadRoadmap(); };
  return <div className="page-section roadmap-page"><div className="panel-card"><div className="panel-heading"><div><span className="eyebrow">PERSONALIZED PLAN</span><h3>Career Roadmap</h3><p className="panel-subtitle">A persisted plan for skills, learning, projects, certifications, interview preparation, and applications.</p></div><label className="field-label"><span>Target job</span><select value={role} onChange={(event) => { setRole(event.target.value); loadRoadmap(event.target.value); }}><option>Frontend Developer</option><option>Backend Developer</option><option>Full Stack Developer</option><option>Data Analyst</option><option>Data Scientist</option><option>Software Engineer</option></select></label></div>{error && <p className="form-error">{error}</p>}{roadmap && <><div className="roadmap-progress"><div className="progress-label"><span>{roadmap.targetRole} readiness</span><strong>{roadmap.progress}%</strong></div><div className="progress-track"><span style={{ width: `${roadmap.progress}%` }} /></div></div><div className="roadmap-grid">{roadmap.items.map((item) => <article className="roadmap-card" key={item._id}><span className="result-kicker">{item.category}</span><h4>{item.title}</h4><p>{item.description}</p><select value={item.status} onChange={(event) => updateStatus(item, event.target.value)}><option>Not Started</option><option>In Progress</option><option>Completed</option></select></article>)}</div></>}</div></div>;
}

function InterviewSimulatorPage({ auth }) {
  const [role, setRole] = useState('Software Engineer');
  const [experience, setExperience] = useState('Mid level');
  const [type, setType] = useState('Technical');
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [scores, setScores] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [message, setMessage] = useState('');
  const start = async () => { const response = await fetch(`http://localhost:5001/api/interview/mock?category=${type}&difficulty=Medium&role=${encodeURIComponent(role)}`, { headers: { Authorization: `Bearer ${auth.token}` } }); const data = await response.json(); if (!response.ok) return setMessage(data.message || 'Unable to start simulator.'); setQuestions(data.questions || []); setIndex(0); setScores([]); setFeedback(null); setAnswer(''); setMessage(data.fallbackMessage || `${experience} simulator ready.`); };
  const submit = async (event) => { event.preventDefault(); const question = questions[index]; const response = await fetch('http://localhost:5001/api/interview/practice', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ questionId: question.id, answer }) }); const data = await response.json(); if (!response.ok) return setMessage(data.message || 'Unable to score answer.'); setFeedback(data.practice); setScores((current) => [...current, data.practice.score]); };
  const next = () => { setIndex((current) => current + 1); setAnswer(''); setFeedback(null); };
  const overall = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  return <div className="page-section simulator-page"><div className="panel-card"><div className="panel-heading"><div><span className="eyebrow">PRACTICE ROOM</span><h3>Interview Simulator</h3><p className="panel-subtitle">Generate a role-specific session, answer each question, and review your score.</p></div>{scores.length > 0 && <div className="score-badge">Overall {overall}/100</div>}</div><div className="form-grid three-cols"><label className="field-label"><span>Job role</span><select value={role} onChange={(event) => setRole(event.target.value)}><option>Software Engineer</option><option>Frontend Developer</option><option>Backend Developer</option><option>Full Stack Developer</option><option>Data Analyst</option></select></label><label className="field-label"><span>Experience level</span><select value={experience} onChange={(event) => setExperience(event.target.value)}><option>Entry level</option><option>Mid level</option><option>Senior</option></select></label><label className="field-label"><span>Interview type</span><select value={type} onChange={(event) => setType(event.target.value)}><option>HR</option><option>Behavioral</option><option>Technical</option><option>Situational</option></select></label></div><button className="primary-btn" type="button" onClick={start}>Generate simulator questions</button>{message && <p className="info-box">{message}</p>}{questions[index] && <div className="simulator-question"><span className="result-kicker">Question {index + 1} of {questions.length}</span><h3>{questions[index].question}</h3>{!feedback ? <form onSubmit={submit}><textarea rows="8" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer with specific evidence..." required /><button className="primary-btn" type="submit">Evaluate answer</button></form> : <div className="feedback-grid"><div className="score-badge">{feedback.score}/100</div><div><h4>Strengths</h4>{feedback.strengths.map((item) => <p key={item}>• {item}</p>)}<h4>Improvement suggestions</h4>{feedback.areasForImprovement.map((item) => <p key={item}>• {item}</p>)}<button className="secondary-btn" type="button" onClick={next}>{index + 1 < questions.length ? 'Next question' : 'Finish session'}</button></div></div>}</div>}{scores.length > 0 && !questions[index] && <div className="info-box"><strong>Session complete: {overall}/100</strong><p>Review your answer feedback above and start another session to practice a different interview type.</p></div>}</div></div>;
}

function ToolPage({ auth, jobs, resume, mode }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [generated, setGenerated] = useState('');
  const [status, setStatus] = useState('');
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [editId, setEditId] = useState(null);
  const configs = {
    'cover-letter': { kind: 'cover-letters', title: 'AI Cover Letter Generator' },
    email: { kind: 'emails', title: 'Application Email Generator' },
    alerts: { kind: 'job-alerts', title: 'Smart Job Alerts' },
    goals: { kind: 'career-goals', title: 'Career Goals' },
    learning: { kind: 'learning-items', title: 'Learning Hub' },
    certifications: { kind: 'certifications', title: 'Certifications & Achievements' },
    portfolio: { kind: 'projects', title: 'Portfolio Builder' },
    calendar: { kind: 'interview-events', title: 'Interview Calendar' },
    notifications: { kind: 'notifications', title: 'Notification Center' },
  };
  const config = configs[mode];
  const load = async () => { if (!config) return; const response = await fetch(`http://localhost:5001/api/tools/${config.kind}`, { headers: { Authorization: `Bearer ${auth.token}` } }); const data = await response.json(); if (response.ok) setItems(data.items || []); };
  useEffect(() => { load(); }, [auth?.token, mode]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (data = form, title = form.title || form.name || 'Saved item') => { const response = await fetch(`http://localhost:5001/api/tools/${config.kind}${editId ? `/${editId}` : ''}`, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ ...data, title }) }); const payload = await response.json(); if (!response.ok) return setStatus(payload.message || 'Unable to save item.'); if (!editId && mode === 'alerts') await fetch('http://localhost:5001/api/tools/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ title: 'Job alert saved', message: `Your ${data.role || 'new'} job alert is active.` }) }); setStatus(editId ? 'Updated your saved item.' : 'Saved to your account.'); setForm({}); setGenerated(''); setEditId(null); load(); };
  const remove = async (item) => { await fetch(`http://localhost:5001/api/tools/${config.kind}/${item._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` } }); load(); };
  const edit = (item) => { setEditId(item._id); setForm({ ...item.data, title: item.title, name: item.data.name || item.title }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const markRead = async (item) => { await fetch(`http://localhost:5001/api/tools/notifications/${item._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ ...item.data, title: item.title, read: true }) }); load(); };
  const generateText = () => {
    if (mode === 'cover-letter') setGenerated(`Dear Hiring Team at ${form.company || 'the company'},\n\nI am excited to apply for the ${form.jobTitle || 'role'} position. My experience with ${resume?.skills?.slice(0, 4).join(', ') || 'relevant product and technical work'} aligns with the role's needs. ${form.description || 'I would welcome the opportunity to contribute measurable results to your team.'}\n\nThank you for your consideration. I would be glad to discuss how I can contribute.\n\nSincerely,\n${resume?.fullName || auth.user.name}`);
    if (mode === 'email') setGenerated(`Subject: ${form.emailType || 'Application'} - ${form.jobTitle || 'Job opportunity'}\n\nHello ${form.recipient || 'there'},\n\nI am reaching out regarding ${form.jobTitle || 'the opportunity'} at ${form.company || 'your company'}. ${form.context || 'I am interested in learning more and have attached my resume for consideration.'}\n\nThank you,\n${resume?.fullName || auth.user.name}`);
  };
  const copy = async () => { await navigator.clipboard?.writeText(generated); setStatus('Copied to clipboard.'); };
  const download = () => { const blob = new Blob([generated], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${mode}.txt`; anchor.click(); URL.revokeObjectURL(url); };
  const renderForm = () => {
    if (mode === 'cover-letter') return <><label className="field-label"><span>Job title</span><input value={form.jobTitle || ''} onChange={(event) => update('jobTitle', event.target.value)} /></label><label className="field-label"><span>Company</span><input value={form.company || ''} onChange={(event) => update('company', event.target.value)} /></label><label className="field-label"><span>Tone</span><select value={form.tone || 'Professional'} onChange={(event) => update('tone', event.target.value)}><option>Professional</option><option>Warm</option><option>Confident</option></select></label><label className="field-label full-span"><span>Job description</span><textarea rows="5" value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></label></>;
    if (mode === 'email') return <><label className="field-label"><span>Email type</span><select value={form.emailType || 'Job application'} onChange={(event) => update('emailType', event.target.value)}>{['Job application', 'Follow-up', 'Interview confirmation', 'Interview thank-you', 'Recruiter contact', 'Offer response'].map((type) => <option key={type}>{type}</option>)}</select></label><label className="field-label"><span>Recipient</span><input value={form.recipient || ''} onChange={(event) => update('recipient', event.target.value)} /></label><label className="field-label"><span>Company / job</span><input value={form.company || ''} onChange={(event) => update('company', event.target.value)} /></label><label className="field-label full-span"><span>Context</span><textarea rows="5" value={form.context || ''} onChange={(event) => update('context', event.target.value)} /></label></>;
    if (mode === 'alerts') return <><label className="field-label"><span>Role</span><input value={form.role || ''} onChange={(event) => update('role', event.target.value)} /></label><label className="field-label"><span>Skills</span><input value={form.skills || ''} onChange={(event) => update('skills', event.target.value)} /></label><label className="field-label"><span>Location</span><input value={form.location || ''} onChange={(event) => update('location', event.target.value)} /></label><label className="field-label"><span>Salary minimum</span><input type="number" value={form.salary || ''} onChange={(event) => update('salary', event.target.value)} /></label><label className="field-label"><span>Work mode</span><select value={form.workMode || 'Any'} onChange={(event) => update('workMode', event.target.value)}><option>Any</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label></>;
    if (mode === 'goals') return <><label className="field-label"><span>Goal title</span><input value={form.title || ''} onChange={(event) => update('title', event.target.value)} /></label><label className="field-label"><span>Deadline</span><input type="date" value={form.deadline || ''} onChange={(event) => update('deadline', event.target.value)} /></label><label className="field-label full-span"><span>Description</span><textarea rows="4" value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></label></>;
    if (mode === 'learning') return <><label className="field-label"><span>Skill to learn</span><input value={form.skill || ''} onChange={(event) => update('skill', event.target.value)} /></label><label className="field-label"><span>Priority</span><select value={form.priority || 'Medium'} onChange={(event) => update('priority', event.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></label><label className="field-label"><span>Learning category</span><input value={form.category || ''} onChange={(event) => update('category', event.target.value)} placeholder="Course, practice, project" /></label></>;
    if (mode === 'certifications') return <><label className="field-label"><span>Certificate name</span><input value={form.name || ''} onChange={(event) => update('name', event.target.value)} /></label><label className="field-label"><span>Issuer</span><input value={form.issuer || ''} onChange={(event) => update('issuer', event.target.value)} /></label><label className="field-label"><span>Issue date</span><input type="date" value={form.issueDate || ''} onChange={(event) => update('issueDate', event.target.value)} /></label><label className="field-label"><span>Expiry date</span><input type="date" value={form.expiryDate || ''} onChange={(event) => update('expiryDate', event.target.value)} /></label><label className="field-label"><span>Credential ID</span><input value={form.credentialId || ''} onChange={(event) => update('credentialId', event.target.value)} /></label></>;
    if (mode === 'portfolio') return <><label className="field-label"><span>Project title</span><input value={form.title || ''} onChange={(event) => update('title', event.target.value)} /></label><label className="field-label"><span>Technologies</span><input value={form.technologies || ''} onChange={(event) => update('technologies', event.target.value)} /></label><label className="field-label"><span>GitHub URL</span><input value={form.githubUrl || ''} onChange={(event) => update('githubUrl', event.target.value)} /></label><label className="field-label"><span>Demo URL</span><input value={form.demoUrl || ''} onChange={(event) => update('demoUrl', event.target.value)} /></label><label className="field-label full-span"><span>Description</span><textarea rows="4" value={form.description || ''} onChange={(event) => update('description', event.target.value)} /></label></>;
    return <><label className="field-label"><span>Company</span><input value={form.company || ''} onChange={(event) => update('company', event.target.value)} /></label><label className="field-label"><span>Job</span><input value={form.job || ''} onChange={(event) => update('job', event.target.value)} /></label><label className="field-label"><span>Date</span><input type="date" value={form.date || ''} onChange={(event) => update('date', event.target.value)} /></label><label className="field-label"><span>Time</span><input type="time" value={form.time || ''} onChange={(event) => update('time', event.target.value)} /></label><label className="field-label"><span>Interview type</span><input value={form.type || ''} onChange={(event) => update('type', event.target.value)} /></label><label className="field-label"><span>Meeting link</span><input value={form.link || ''} onChange={(event) => update('link', event.target.value)} /></label><label className="field-label full-span"><span>Notes</span><textarea rows="3" value={form.notes || ''} onChange={(event) => update('notes', event.target.value)} /></label></>;
  };
  if (mode === 'notifications') return <div className="page-section"><div className="panel-card"><div className="panel-heading"><div><h3>Notification Center</h3><p className="panel-subtitle">{items.filter((item) => !item.read).length} unread notifications.</p></div><button className="secondary-btn" onClick={async () => { await fetch('http://localhost:5001/api/tools/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}` } }); load(); }}>Mark all read</button></div>{items.length ? items.map((item) => <div className={`notification-row ${item.read ? 'read' : ''}`} key={item._id}><div><strong>{item.title}</strong><p>{item.data.message || item.data.description}</p></div><div className="mini-actions"><button className="small-btn ghost-btn" onClick={() => markRead(item)}>Mark read</button><button className="small-btn ghost-btn danger" onClick={() => remove(item)}>Delete</button></div></div>) : <div className="empty-state">No notifications yet.</div>}</div></div>;
  if (mode === 'comparison') return <div className="page-section"><div className="panel-card"><div className="panel-heading"><div><h3>Job Comparison</h3><p className="panel-subtitle">Select two to four tracked jobs for a side-by-side view.</p></div></div><div className="comparison-picker">{jobs.map((job) => <label key={job._id || job.id}><input type="checkbox" checked={selectedJobs.includes(String(job._id || job.id))} onChange={() => setSelectedJobs((current) => current.includes(String(job._id || job.id)) ? current.filter((id) => id !== String(job._id || job.id)) : current.length < 4 ? [...current, String(job._id || job.id)] : current)} />{job.title} · {job.company}</label>)}</div>{selectedJobs.length >= 2 ? <div className="comparison-table"><table><thead><tr><th>Criteria</th>{jobs.filter((job) => selectedJobs.includes(String(job._id || job.id))).map((job) => <th key={job._id || job.id}>{job.title}</th>)}</tr></thead><tbody>{['company', 'salary', 'location', 'workArrangement', 'experienceLevel', 'jobType', 'requiredSkills'].map((field) => <tr key={field}><th>{field}</th>{jobs.filter((job) => selectedJobs.includes(String(job._id || job.id))).map((job) => <td key={job._id || job.id}>{Array.isArray(job[field]) ? job[field].join(', ') : job[field] || 'Not set'}</td>)}</tr>)}</tbody></table></div> : <div className="empty-state">Choose at least two jobs.</div>}</div></div>;
  if (mode === 'salary') return <div className="page-section"><div className="panel-card"><div className="panel-heading"><div><h3>Salary Insights</h3><p className="panel-subtitle">Estimates use only salary ranges already stored in your tracked jobs.</p></div></div><div className="form-grid three-cols"><label className="field-label"><span>Job title</span><input value={form.jobTitle || ''} onChange={(event) => update('jobTitle', event.target.value)} /></label><label className="field-label"><span>Location</span><input value={form.location || ''} onChange={(event) => update('location', event.target.value)} /></label><label className="field-label"><span>Experience</span><input value={form.experience || ''} onChange={(event) => update('experience', event.target.value)} /></label></div><button className="primary-btn" onClick={() => setGenerated('')}>Compare tracked salaries</button><div className="salary-insight-grid">{jobs.filter((job) => (!form.jobTitle || job.title.toLowerCase().includes(form.jobTitle.toLowerCase())) && (!form.location || String(job.location).toLowerCase().includes(form.location.toLowerCase()))).map((job) => <div className="result-block" key={job._id || job.id}><strong>{job.title}</strong><p>{job.company} · {job.location}</p><h4>{job.salary || 'Salary not available'}</h4><small>Estimate based on your stored application data, not market-wide salary data.</small></div>)}</div></div></div>;
  return <div className="page-section"><div className="panel-card"><div className="panel-heading"><div><h3>{config.title}</h3><p className="panel-subtitle">Persistent JobTrack workspace data for your account.</p></div></div><div className="form-grid two-cols">{renderForm()}</div><div className="form-actions"><button className="primary-btn" onClick={() => (mode === 'cover-letter' || mode === 'email') ? generateText() : save()}>{mode === 'cover-letter' || mode === 'email' ? 'Generate' : editId ? 'Update' : 'Save'}</button>{editId && <button className="secondary-btn" onClick={() => { setEditId(null); setForm({}); }}>Cancel</button>}{generated && <><button className="secondary-btn" onClick={() => save({ ...form, content: generated }, form.jobTitle || form.emailType)}>Save generated</button><button className="secondary-btn" onClick={copy}>Copy</button><button className="secondary-btn" onClick={download}>Download</button></>}</div>{generated && <textarea className="generated-content" rows="14" value={generated} onChange={(event) => setGenerated(event.target.value)} />}{status && <p className="info-box">{status}</p>}<div className="tool-item-list">{items.map((item) => <div className="tool-item" key={item._id}><div><strong>{item.title}</strong><p>{item.data.content || item.data.description || item.data.message || item.data.skill || item.data.issuer || item.data.technologies || item.data.company || ''}</p></div><div className="mini-actions"><button className="small-btn ghost-btn" onClick={() => edit(item)}>Edit</button><button className="small-btn ghost-btn danger" onClick={() => remove(item)}>Delete</button></div></div>)}</div></div></div>;
}

function AssistantPage({ auth }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const ask = async (event) => { event.preventDefault(); const response = await fetch('http://localhost:5001/api/career/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ question }) }); const data = await response.json(); setAnswer(data.answer || data.message || 'No guidance available.'); };
  return <div className="page-section"><div className="panel-card assistant-page"><div className="panel-heading"><div><h3>AI Career Assistant</h3><p className="panel-subtitle">Ask about jobs, skills, resumes, interviews, projects, roadmaps, or cover letters.</p></div></div><div className="assistant-prompts">{['What jobs match my skills?', 'What skills should I learn?', 'How should I prepare for this interview?', 'What projects should I build?', 'Help me write a cover letter.'].map((prompt) => <button className="secondary-btn small-btn" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div><form className="assistant-form" onSubmit={ask}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a career question" required /><button className="primary-btn">Ask assistant</button></form>{answer && <div className="info-box"><strong>JobTrack guidance</strong><p>{answer}</p></div>}</div></div>;
}

function PublicProfilePage() {
  const [profile, setProfile] = useState(null);
  const location = useLocation();
  useEffect(() => { const userId = location.pathname.split('/').filter(Boolean)[1]; if (!userId || userId === 'public') return; fetch(`http://localhost:5001/api/public/profile/${userId}`).then((response) => response.ok ? response.json() : null).then((data) => setProfile(data?.profile || null)).catch(() => setProfile(null)); }, [location.pathname]);
  if (!profile) return <div className="public-page"><div className="container"><div className="empty-state">This public profile is unavailable or private.</div></div></div>;
  return <div className="public-page"><div className="container public-profile-page"><div className="panel-card"><div className="profile-hero"><div className="avatar-large">{profile.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><span className="eyebrow">PUBLIC CAREER PROFILE</span><h1>{profile.name}</h1><p>{profile.about || 'JobTrack professional profile'}</p></div></div><div className="public-profile-grid"><div className="result-block"><h4>Skills</h4><p>{profile.skills?.join(', ') || 'No public skills provided.'}</p></div><div className="result-block"><h4>Projects</h4>{profile.projects?.length ? profile.projects.map((item) => <p key={item._id || item.title}>{item.title || item.data?.title}</p>) : <p>No public projects provided.</p>}</div><div className="result-block"><h4>Experience & Education</h4><p>{profile.experience?.length || 0} experience entries · {profile.education?.length || 0} education entries</p><small>Private applications, deadlines, analytics, and account details are never shown.</small></div></div></div></div></div>;
}

function ProfilePage({ auth, onUpdateProfile }) {
  const [profile, setProfile] = useState(auth?.user?.profile || demoUser.profile);
  const [publicProfile, setPublicProfile] = useState(auth?.user?.publicProfile || { enabled: false, about: true, skills: true, projects: true, experience: true, certifications: true, education: true });
  const [status, setStatus] = useState('');
  const [readiness, setReadiness] = useState({ profileCompletion: 0, profileMissing: [] });

  useEffect(() => {
    setProfile(auth?.user?.profile || demoUser.profile);
    setPublicProfile(auth?.user?.publicProfile || { enabled: false, about: true, skills: true, projects: true, experience: true, certifications: true, education: true });
    fetch('http://localhost:5001/api/dashboard/summary', { headers: { Authorization: `Bearer ${auth?.token}` } }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.data?.readiness) setReadiness(data.data.readiness); }).catch(() => {});
  }, [auth?.user?.profile]);

  const handleSave = async () => {
    if (!auth?.token) return;

    try {
      const response = await fetch('http://localhost:5001/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          name: auth.user.name,
          email: auth.user.email,
          profile,
          publicProfile,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save profile.');
      onUpdateProfile({ ...auth.user, profile, name: auth.user.name, email: auth.user.email });
      setStatus('Profile saved successfully.');
    } catch (error) {
      setStatus(error.message || 'Unable to save profile.');
    }
  };

  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading"><div><h3>Profile</h3><p className="panel-subtitle">{readiness.profileCompletion}% complete</p></div><div className="profile-completion"><div className="progress-track"><span style={{ width: `${readiness.profileCompletion}%` }} /></div>{readiness.profileMissing.length ? <small>Missing: {readiness.profileMissing.join(', ')}</small> : <small>Everything is complete.</small>}</div></div>
        <div className="profile-layout">
          <div className="profile-photo-box">
            <div className="avatar-large">{auth?.user?.name ? auth.user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : 'JT'}</div>
          </div>
          <div className="profile-form">
            <div className="form-grid two-cols">
              <input value={auth?.user?.name || ''} onChange={(e) => onUpdateProfile({ ...auth.user, name: e.target.value })} placeholder="Name" />
              <input value={auth?.user?.email || ''} onChange={(e) => onUpdateProfile({ ...auth.user, email: e.target.value })} placeholder="Email" />
              <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" />
              <input value={profile.location || ''} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="Location" />
              <input value={profile.linkedin || ''} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} placeholder="LinkedIn" />
              <input value={profile.portfolio || ''} onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })} placeholder="Portfolio" />
            </div>
            <textarea rows="4" value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Professional summary" />
            <button className="primary-btn" onClick={handleSave}>Save profile</button>
            <div className="result-block public-profile-settings"><h4>Public profile privacy</h4><label className="checkbox-label"><input type="checkbox" checked={Boolean(publicProfile.enabled)} onChange={(event) => setPublicProfile({ ...publicProfile, enabled: event.target.checked })} /> Enable public profile</label>{publicProfile.enabled && <div className="checkbox-grid">{['about', 'skills', 'projects', 'experience', 'certifications', 'education'].map((section) => <label className="checkbox-label" key={section}><input type="checkbox" checked={publicProfile[section] !== false} onChange={(event) => setPublicProfile({ ...publicProfile, [section]: event.target.checked })} /> {section}</label>)}</div>}</div>
            {status && <div className="error-box" style={{ marginTop: '12px' }}>{status}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ auth, theme, setTheme, onLogout }) {
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState('');

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setStatus('Password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }
    try {
      const response = await fetch('http://localhost:5001/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update password.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatus(data.message || 'Password updated successfully.');
    } catch (error) {
      setStatus(error.message || 'Unable to update password.');
    }
  };

  return (
    <div className="page-section">
      <div className="panel-card">
        <div className="panel-heading"><h3>Settings</h3></div>
        <div className="settings-grid">
          <div className="result-block"><h4>Account Settings</h4><p>Email notifications, profile sharing, and login settings.</p></div>
          <div className="result-block">
            <h4>Password Settings</h4>
            <form onSubmit={handlePasswordChange} className="auth-form">
              <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Current password" />
              <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="New password" />
              <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Confirm new password" />
              <button type="submit" className="primary-btn small-btn">Update password</button>
            </form>
          </div>
          <div className="result-block"><h4>Notification Settings</h4><p>Turn interview reminders on or off.</p></div>
          <div className="result-block"><h4>Theme Settings</h4><div className="segmented-control"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button></div></div>
          <div className="result-block"><h4>Privacy Settings</h4><p>Control personal profile visibility and analytics sharing.</p></div>
          <div className="result-block"><h4>Sign out</h4><button className="secondary-btn small-btn" onClick={onLogout}>Logout</button></div>
        </div>
        {status && <div className="error-box" style={{ marginTop: '12px' }}>{status}</div>}
      </div>
    </div>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <p className="eyebrow">404</p>
        <h1>Page Not Found</h1>
        <button className="primary-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [jobs, setJobs] = useState(() => getStoredJobs());
  const [bookmarks, setBookmarks] = useState(() => getStoredBookmarks());
  const [resume, setResume] = useState(() => getStoredResume());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('jobtrack-theme') || 'light');

  useEffect(() => {
    if (auth) {
      localStorage.setItem('jobtrack-auth', JSON.stringify(auth));
      return;
    }
    clearJobTrackAuthSession();
  }, [auth]);

  useEffect(() => {
    if (!auth?.token) {
      setJobs(getStoredJobs());
      setBookmarks(getStoredBookmarks());
      setResume(getStoredResume());
      return;
    }

    const loadSecureData = async () => {
      try {
        const [jobsResponse, bookmarksResponse, resumeResponse] = await Promise.all([
          fetch('http://localhost:5001/api/jobs', {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
          fetch('http://localhost:5001/api/bookmarks', {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
          fetch('http://localhost:5001/api/resume', {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
        ]);

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          setJobs(jobsData.jobs || []);
        }

        if (bookmarksResponse.ok) {
          const bookmarksData = await bookmarksResponse.json();
          setBookmarks(bookmarksData.bookmarks || []);
        }

        if (resumeResponse.ok) {
          const resumeData = await resumeResponse.json();
          if (resumeData?.resume) {
            setResume(normalizeResumeData(resumeData.resume));
          }
        }
      } catch {
        setJobs(getStoredJobs());
        setBookmarks(getStoredBookmarks());
        setResume(getStoredResume());
      }
    };

    loadSecureData();
  }, [auth?.token]);

  useEffect(() => {
    localStorage.setItem('jobtrack-jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('jobtrack-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('jobtrack-resume', JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    localStorage.setItem('jobtrack-theme', theme);
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!auth?.token) return;

    const loadCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/auth/me', {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (!response.ok) {
          clearJobTrackAuthSession();
          setAuth(null);
          return;
        }

        const data = await response.json();
        if (data?.user) {
          const nextAuth = { token: auth.token, user: data.user };
          setAuth((current) => (current?.token === auth.token ? nextAuth : current));
          localStorage.setItem('jobtrack-auth', JSON.stringify(nextAuth));
        }
      } catch {
        clearJobTrackAuthSession();
        setAuth(null);
      }
    };

    loadCurrentUser();
  }, [auth?.token]);

  const handleLogin = async (form, setError) => {
    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setError('Please fill out both email and password.');
      return;
    }

    clearJobTrackAuthSession();
    setAuth(null);

    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.unverified) {
          window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
          return;
        }
        throw new Error(data.message || 'Login failed.');
      }

      const nextAuth = { user: data.user, token: data.token };
      setAuth(nextAuth);
      localStorage.setItem('jobtrack-auth', JSON.stringify(nextAuth));
      window.location.href = '/dashboard';
    } catch (error) {
      if (email === demoUser.email && password === 'demo123') {
        const demoAuth = { user: demoUser, token: 'demo-token' };
        setAuth(demoAuth);
        localStorage.setItem('jobtrack-auth', JSON.stringify(demoAuth));
        window.location.href = '/dashboard';
        return;
      }
      setError(error.message || 'Unable to log in.');
    }
  };

  const handleSignup = async (form, setError) => {
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill out every field.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    clearJobTrackAuthSession();
    setAuth(null);

    try {
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Account creation failed.');
      }

      if (data.verificationEmailSent) {
        window.location.href = `/verify-email?email=${encodeURIComponent(form.email)}&sent=1`;
        return;
      }

      setError(data.message || "We couldn't send the verification email. Please try again.");
    } catch (error) {
      setError(error.message || 'Something went wrong.');
    }
  };

  const handleLogout = () => {
    clearJobTrackAuthSession();
    setAuth(null);
    window.location.href = '/login';
  };

  const updateProfile = (nextUser) => {
    setAuth((current) => ({
      token: current?.token || '',
      user: nextUser,
    }));
  };

  const toggleBookmark = async (item) => {
    const currentBookmark = bookmarks.find((bookmark) => bookmark.targetId === item.id || bookmark.id === item.id);

    if (auth?.token) {
      try {
        if (currentBookmark) {
          const response = await fetch(`http://localhost:5001/api/bookmarks/${currentBookmark.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${auth.token}` },
          });
          if (!response.ok) throw new Error('Unable to remove bookmark.');
          const next = bookmarks.filter((bookmark) => bookmark.id !== currentBookmark.id);
          setBookmarks(next);
          return;
        }

        const response = await fetch('http://localhost:5001/api/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            id: `bookmark-${Date.now()}`,
            type: 'job',
            targetId: item.id,
            title: item.title,
          }),
        });

        if (!response.ok) throw new Error('Unable to save bookmark.');
        const data = await response.json();
        setBookmarks((current) => [...current, data.bookmark]);
        return;
      } catch {
        setBookmarks((current) => {
          const existing = current.find((bookmark) => bookmark.id === item.id || bookmark.targetId === item.id);
          if (existing) {
            return current.filter((bookmark) => bookmark.id !== existing.id && bookmark.targetId !== item.id);
          }
          return [...current, { ...item, id: Date.now(), type: 'job', targetId: item.id }];
        });
      }
    }

    setBookmarks((current) => {
      const existing = current.find((bookmark) => bookmark.id === item.id || bookmark.targetId === item.id);
      if (existing) {
        return current.filter((bookmark) => bookmark.id !== existing.id && bookmark.targetId !== item.id);
      }
      return [...current, { ...item, id: Date.now(), type: 'job', targetId: item.id }];
    });
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/resume-ai" element={<ResumeAIPage />} />
      <Route path="/career-resources" element={<CareerResourcesPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<AuthPage type="login" buttonText="Login" isSubmitting={false} onSubmit={handleLogin} />} />
      <Route path="/signup" element={<AuthPage type="signup" buttonText="Create account" isSubmitting={false} onSubmit={handleSignup} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/verification-success" element={<VerificationSuccessPage />} />
      <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><DashboardPage auth={auth} jobs={jobs} bookmarks={bookmarks} theme={theme} handleLogout={handleLogout} /></Layout></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><JobsPage jobs={jobs} setJobs={setJobs} bookmarks={bookmarks} toggleBookmark={toggleBookmark} auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><RecommendationsPage auth={auth} jobs={jobs} resume={resume} toggleBookmark={toggleBookmark} /></Layout></ProtectedRoute>} />
      <Route path="/resume-match" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ResumeMatchingPage auth={auth} jobs={jobs} resume={resume} /></Layout></ProtectedRoute>} />
      <Route path="/skill-gap" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><SkillGapPage auth={auth} jobs={jobs} resume={resume} /></Layout></ProtectedRoute>} />
      <Route path="/career-roadmap" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><CareerRoadmapPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/interview-simulator" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><InterviewSimulatorPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><AnalyticsPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/job-comparison" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="comparison" /></Layout></ProtectedRoute>} />
      <Route path="/job-alerts" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="alerts" /></Layout></ProtectedRoute>} />
      <Route path="/cover-letter" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="cover-letter" /></Layout></ProtectedRoute>} />
      <Route path="/email-generator" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="email" /></Layout></ProtectedRoute>} />
      <Route path="/learning-hub" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="learning" /></Layout></ProtectedRoute>} />
      <Route path="/career-goals" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="goals" /></Layout></ProtectedRoute>} />
      <Route path="/interview-calendar" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="calendar" /></Layout></ProtectedRoute>} />
      <Route path="/salary-insights" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="salary" /></Layout></ProtectedRoute>} />
      <Route path="/certifications" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="certifications" /></Layout></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="portfolio" /></Layout></ProtectedRoute>} />
      <Route path="/career-assistant" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><AssistantPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ToolPage auth={auth} jobs={jobs} resume={resume} mode="notifications" /></Layout></ProtectedRoute>} />
      <Route path="/profile/public" element={<PublicProfilePage />} />
      <Route path="/profile/:userId" element={<PublicProfilePage />} />
      <Route path="/saved-jobs" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><SavedJobsPage jobs={jobs} setJobs={setJobs} bookmarks={bookmarks} toggleBookmark={toggleBookmark} auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><BookmarksPage bookmarks={bookmarks} /></Layout></ProtectedRoute>} />
      <Route path="/resume" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ResumeBuilderPage resume={resume} setResume={setResume} auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/ats" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ATSCheckerPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><AIEnhancementPage /></Layout></ProtectedRoute>} />
      <Route path="/skills" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><SkillsCheckPage /></Layout></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><InterviewPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/career" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><CareerPage auth={auth} /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><ProfilePage auth={auth} onUpdateProfile={updateProfile} /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute isAuthenticated={Boolean(auth)}><Layout auth={auth} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} theme={theme} setTheme={setTheme}><SettingsPage auth={auth} theme={theme} setTheme={setTheme} onLogout={handleLogout} /></Layout></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
