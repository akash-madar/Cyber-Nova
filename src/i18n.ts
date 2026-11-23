import type { SecurityQuestionKey } from './types';

export type AppLanguage = 'en' | 'kn' | 'hi';

export const LANGUAGE_OPTIONS: Array<{ code: AppLanguage; nativeLabel: string; englishName: string }> = [
  { code: 'en', nativeLabel: 'English', englishName: 'English' },
  { code: 'kn', nativeLabel: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { code: 'hi', nativeLabel: 'हिन्दी', englishName: 'Hindi' },
];

export interface Translations {
  // Landing Top Bar & Hero
  navHowItWorks: string;
  navTwoAgents: string;
  navPortals: string;
  navSafeguards: string;
  getStarted: string;
  signInWorkspace: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCaptionTitle: string;
  heroCaptionBody: string;
  statAgentsTitle: string;
  statAgentsDesc: string;
  statOutcomesTitle: string;
  statOutcomesDesc: string;
  statApprovalTitle: string;
  statApprovalDesc: string;
  statTablesTitle: string;
  statTablesDesc: string;
  twoAgentsHeading: string;
  twoAgentsSubheading: string;
  agent1Label: string;
  agent1Title: string;
  agent1Body: string;
  agent1Bullets: [string, string, string];
  agent2Label: string;
  agent2Title: string;
  agent2Body: string;
  agent2Bullets: [string, string, string];
  portalsHeading: string;
  portalsSubheading: string;
  safeguardsBadge: string;
  safeguardsHeading: string;
  safeguardsBody: string;
  createStudentAccount: string;
  footerDisclaimer: string;

  // Auth
  backHome: string;
  authRegisterTitle: string;
  authLoginTitle: string;
  authRegisterSub: string;
  authLoginSub: string;
  registerTab: string;
  signInTab: string;
  fullNameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  passwordHint: string;
  createAndEnter: string;
  signInBtn: string;
  pleaseWait: string;
  authSecurityNote: string;
  forgotPasswordLink: string;
  forgotPasswordTitle: string;
  forgotPasswordSub: string;
  continueResetBtn: string;
  loadingQuestionsBtn: string;
  securityQuestionsTitle: string;
  securityQuestionsSub: string;
  question1Label: string;
  question2Label: string;
  question3Label: string;
  answerPlaceholder: string;
  answerPromptLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  resetPasswordBtn: string;
  backToSignIn: string;
  securityQuestionLabels: Record<SecurityQuestionKey, string>;

  // Workspace Nav & Header
  navDashboard: string;
  navDiscovery: string;
  navSaved: string;
  navAgents: string;
  navProfile: string;
  navDeveloper: string;
  signOut: string;
  discoverSchemesBtn: string;
  languageLabel: string;

  // Dashboard
  dashTitle: string;
  dashSub: string;
  metricRetrieved: string;
  metricLikelyEligible: string;
  metricNeedsInfo: string;
  metricSaved: string;
  metricAllMatched: string;
  metricMissingFields: string;
  metricWithChecklists: string;
  emptyDashTitle: string;
  emptyDashBody: string;
  completeProfileBtn: string;
  launchDiscoveryBtn: string;
  outcomeDistTitle: string;
  outcomeDistSub: string;
  deadlineTrackerTitle: string;

  // Outcomes
  outcomeLikelyEligible: string;
  outcomeNotEligible: string;
  outcomeNeedsInfo: string;

  // Live Discovery
  discoveryTitle: string;
  discoverySub: string;
  searchQueryLabel: string;
  searchQueryPlaceholder: string;
  targetStateLabel: string;
  categoryLabel: string;
  runAgentsBtn: string;
  filterStatePlaceholder: string;
  filterCategoryPlaceholder: string;
  filterEduPlaceholder: string;
  filterCoursePlaceholder: string;
  allOutcomesOption: string;
  allStagesOption: string;
  withinIncomeCheck: string;
  includeTestCheck: string;
  noSchemesFound: string;
  benefitsLabel: string;
  deadlineLabel: string;
  incomeLimitLabel: string;
  lastVerifiedLabel: string;
  sourceBtn: string;
  inspectPlanBtn: string;

  // Saved & Plans
  savedTitle: string;
  savedSub: string;
  noSavedBody: string;
  documentsLabel: string;
  actionStepsLabel: string;
  openChecklistBtn: string;
  portalApprovedNote: string;
  awaitingReviewNote: string;

  // Profile
  profileTitle: string;
  profileSub: string;
  profileSavedBanner: string;
  saveProfileBtn: string;
  savingProfileBtn: string;

  // Detail & Human Approval
  schemeOverviewTitle: string;
  agent2BreakdownTitle: string;
  recheckRulesBtn: string;
  appPlanTitle: string;
  actionPlanHeading: string;
  docChecklistHeading: string;
  humanApprovalRequiredTitle: string;
  humanApprovalRecordedTitle: string;
  reviewApproveBtn: string;
  openOfficialPortalBtn: string;
  confirmUnlockBtn: string;
  sourceEvidenceTitle: string;

  // Agent Activity & Developer
  agentCenterTitle: string;
  agentCenterSub: string;
  refreshTasksBtn: string;
  noTasksTitle: string;
  devSandboxTitle: string;
  devSandboxSub: string;
  runSandboxBtn: string;

  // Theme, Profile Photo & Application Number
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  profilePhotoLabel: string;
  profilePhotoHint: string;
  uploadPhotoBtn: string;
  removePhotoBtn: string;
  applicationNumberLabel: string;
  applicationNumberPlaceholder: string;
  saveAppNumberBtn: string;
  appNumberSavedBadge: string;
  notEnteredLabel: string;

  // Task Retry, Cache & Quota Diagnostics
  retryTaskBtn: string;
  retryingTaskBtn: string;
  forceRefreshResearch: string;
  quotaAlertTitle: string;
  quotaBillingInstructions: string;
  viewActivityLogsBtn: string;
  activeModelLabel: string;
  agent2SkippedNote: string;
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  en: {
    navHowItWorks: 'How It Works',
    navTwoAgents: 'Two-Agent Engine',
    navPortals: 'Portals Covered',
    navSafeguards: 'Safeguards',
    getStarted: 'Get Started',
    signInWorkspace: 'Sign In to Workspace',
    heroKicker: 'ScholarAI – Your Future, Funded · National & State Scholarship Autonomy',
    heroTitle: 'Discover official Indian scholarships verified against real government rules.',
    heroSubtitle:
      'Built on a strict two-agent autonomous architecture for Indian students. Agent 1 researches live central and state portals such as NSP and Karnataka SSP, while Agent 2 checks your profile against deterministic eligibility conditions and prepares a step-by-step application plan—never guessing, fabricating deadlines, or submitting without your approval.',
    heroCaptionTitle: 'Evidence-First Discovery',
    heroCaptionBody:
      'Every scheme surfaces its official portal URL, last-verified timestamp, and rule breakdown.',
    statAgentsTitle: 'Autonomous AI Agents',
    statAgentsDesc: 'Strict separation between Research (Agent 1) and Eligibility Planning (Agent 2).',
    statOutcomesTitle: 'Deterministic Outcomes',
    statOutcomesDesc: 'Likely Eligible, Not Eligible, or Needs More Information—zero silent guessing.',
    statApprovalTitle: 'Human-Approved Portal Gate',
    statApprovalDesc: 'Plans and checklists are prepared for you; external submissions require your consent.',
    statTablesTitle: 'Persistent Relational Tables',
    statTablesDesc: 'Profiles, official sources, A2A messages, reports, and checklists persisted securely.',
    twoAgentsHeading: 'How the Two Autonomous Agents Collaborate',
    twoAgentsSubheading:
      'ScholarAI coordinates two specialized backend agents over structured JSON Agent-to-Agent (A2A) messages with task tracking, retries, and source verification.',
    agent1Label: '01. AGENT 1 — RESEARCH AGENT',
    agent1Title: 'Live Official Portal Discovery & Grounding',
    agent1Body:
      'Executes live Google Search Grounding via Gemini prioritized on official government domains. Extracts verified eligibility limits, opening dates, deadlines, benefits, and required documents while checking public portal reachability.',
    agent1Bullets: [
      'Marks any unconfirmed date, amount, or link explicitly as "Not verified".',
      'Detects expired academic cycles and attaches retrieved official URLs.',
      'Emits a structured JSON A2A bundle (RESEARCH_RESULT_BUNDLE) to Agent 2.',
    ],
    agent2Label: '02. AGENT 2 — ELIGIBILITY & PLANNING AGENT',
    agent2Title: 'Deterministic Rule Checking & Application Planner',
    agent2Body:
      "Receives Agent 1's research bundle and evaluates every condition through a deterministic rule engine against your student profile—income ceiling, domicile state, category, education level, marks, and course.",
    agent2Bullets: [
      'Explains why every single condition passed, failed, or needs more information.',
      'Builds a tailored step-by-step plan and interactive document checklist.',
      'Requires explicit human approval before unlocking external portal submission.',
    ],
    portalsHeading: 'Official Portals & Government Sources Prioritized',
    portalsSubheading:
      'Agent 1 targets authoritative central and state scholarship portals rather than unverified aggregator blogs:',
    safeguardsBadge: 'Zero-Fabrication & Human-in-the-Loop Guarantee',
    safeguardsHeading: 'Transparent reasoning you can audit before you apply',
    safeguardsBody:
      'ScholarAI never auto-submits applications, never fabricates documents or deadlines, and includes a clearly labelled Developer Mode sandbox alongside full Python (FastAPI + Streamlit + MySQL) source code.',
    createStudentAccount: 'Create Student Account',
    footerDisclaimer:
      'Verify all final application deadlines directly on official government portals before submission.',

    backHome: 'Back to ScholarAI Home',
    authRegisterTitle: 'Create Student Account',
    authLoginTitle: 'Sign In to ScholarAI',
    authRegisterSub:
      'Save your academic profile, run live Agent 1 & Agent 2 checks, and track checklists.',
    authLoginSub: 'Access your saved schemes, eligibility reports, and application plans.',
    registerTab: 'Register',
    signInTab: 'Sign In',
    fullNameLabel: 'Full Name',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    passwordHint: 'Minimum 8 characters',
    createAndEnter: 'Create Account & Enter Workspace',
    signInBtn: 'Sign In',
    pleaseWait: 'Please wait...',
    authSecurityNote:
      'Passwords and personal recovery answers are hashed server-side with per-record scrypt salts. Session tokens remain in application memory only.',
    forgotPasswordLink: 'Forgot password?',
    forgotPasswordTitle: 'Reset Password with Security Questions',
    forgotPasswordSub:
      'Enter your registered email address, then answer your 3 personal security questions to set a new password.',
    continueResetBtn: 'Load My Security Questions',
    loadingQuestionsBtn: 'Loading Questions...',
    securityQuestionsTitle: 'Personal Security Questions (Required for Password Reset)',
    securityQuestionsSub:
      'Choose 3 different personal questions and record answers you will remember. You will use these if you ever forget your password.',
    question1Label: 'Security Question 1',
    question2Label: 'Security Question 2',
    question3Label: 'Security Question 3',
    answerPlaceholder: 'Enter your answer (min 2 characters)',
    answerPromptLabel: 'Your Answer',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    resetPasswordBtn: 'Verify Answers & Change Password',
    backToSignIn: 'Back to Sign In',
    securityQuestionLabels: {
      birth_city: 'What city or town were you born in?',
      first_school: 'What was the name of your first primary school?',
      childhood_nickname: 'What was your childhood nickname?',
      mother_name: "What is your mother's first name?",
      favorite_teacher: 'What was the name of your favorite school teacher?',
      favorite_pet_or_book: 'What is the name of your favorite childhood book or pet?',
    },

    navDashboard: 'Dashboard',
    navDiscovery: 'Live Discovery',
    navSaved: 'Saved & Plans',
    navAgents: 'Agent Activity',
    navProfile: 'Student Profile',
    navDeveloper: 'Developer Mode',
    signOut: 'Sign Out',
    discoverSchemesBtn: 'Discover Schemes',
    languageLabel: 'Language',

    dashTitle: 'Personalized Scholarship Dashboard',
    dashSub: 'All figures reflect real verified records retrieved and persisted for your account.',
    metricRetrieved: 'Retrieved Schemes',
    metricLikelyEligible: 'Likely Eligible',
    metricNeedsInfo: 'Needs More Info',
    metricSaved: 'Saved Schemes',
    metricAllMatched: 'All verified rules matched',
    metricMissingFields: 'Missing profile fields or unverified rule',
    metricWithChecklists: 'Tracked with checklists',
    emptyDashTitle: 'No scholarships researched yet',
    emptyDashBody:
      'Complete your Student Profile (state, category, income, education level) and launch Agent 1 & Agent 2 in Live Discovery to retrieve real official schemes.',
    completeProfileBtn: 'Complete Student Profile',
    launchDiscoveryBtn: 'Launch Live Discovery',
    outcomeDistTitle: 'Eligibility Rule Outcome Distribution',
    outcomeDistSub: 'Computed strictly by the deterministic rule engine across retrieved schemes.',
    deadlineTrackerTitle: 'Deadline Tracker & Priority Schemes',

    outcomeLikelyEligible: 'Likely Eligible',
    outcomeNotEligible: 'Not Eligible',
    outcomeNeedsInfo: 'Needs More Information',

    discoveryTitle: 'Live Scholarship Discovery',
    discoverySub:
      "Dispatch Agent 1 to research official government portals in real time, then review Agent 2's deterministic eligibility check and plan.",
    searchQueryLabel: 'Scholarship Topic / Portal Query',
    searchQueryPlaceholder: 'e.g. Post-Matric OBC Engineering Scholarship NSP & Karnataka SSP',
    targetStateLabel: 'Target State',
    categoryLabel: 'Category',
    runAgentsBtn: 'Run Agent 1 & Agent 2',
    filterStatePlaceholder: 'Filter State...',
    filterCategoryPlaceholder: 'Filter Category...',
    filterEduPlaceholder: 'Filter Education...',
    filterCoursePlaceholder: 'Filter Course...',
    allOutcomesOption: 'All Eligibility Outcomes',
    allStagesOption: 'All Application Stages',
    withinIncomeCheck: 'Within my annual family income limit',
    includeTestCheck: 'Include Developer Sandbox Test Records',
    noSchemesFound:
      'No scholarship records match the current filters. Run Agent 1 & Agent 2 above to discover official schemes.',
    benefitsLabel: 'Benefits',
    deadlineLabel: 'Deadline',
    incomeLimitLabel: 'Income Limit',
    lastVerifiedLabel: 'Last Verified',
    sourceBtn: 'Source',
    inspectPlanBtn: 'Inspect Rules & Plan',

    savedTitle: 'Saved Schemes & Application Progress',
    savedSub:
      'Track your document checklists, upcoming deadlines, and human-approved portal submissions.',
    noSavedBody:
      'No saved schemes or started checklists yet. Open any scheme in Live Discovery to save it or check off documents.',
    documentsLabel: 'Documents',
    actionStepsLabel: 'Action Steps',
    openChecklistBtn: 'Open Checklist & Plan',
    portalApprovedNote: 'Portal approved by you',
    awaitingReviewNote: 'Awaiting your review',

    profileTitle: 'Student Profile',
    profileSub:
      'Agent 2 evaluates scholarship rules deterministically against these exact fields. Leaving critical fields blank causes schemes to be flagged as "Needs More Information".',
    profileSavedBanner:
      'Profile saved to database. You can now recheck any scholarship eligibility immediately.',
    saveProfileBtn: 'Save Student Profile',
    savingProfileBtn: 'Saving Profile...',

    schemeOverviewTitle: 'Scheme Overview',
    agent2BreakdownTitle: 'Agent 2 — Deterministic Eligibility Breakdown',
    recheckRulesBtn: 'Recheck Profile Rules',
    appPlanTitle: 'Personalized Application Plan & Document Checklist',
    actionPlanHeading: 'Step-by-Step Action Plan',
    docChecklistHeading: 'Required Document Checklist',
    humanApprovalRequiredTitle: 'Explicit Human Approval Required Before External Portal Submission',
    humanApprovalRecordedTitle: 'Human Approval Recorded — Official Portal Unlocked',
    reviewApproveBtn: 'Review & Approve Portal Access',
    openOfficialPortalBtn: 'Open Official Portal',
    confirmUnlockBtn: 'Confirm & Unlock Portal Link',
    sourceEvidenceTitle: 'Official Source Evidence Panel',

    agentCenterTitle: 'AI Agent Activity Center',
    agentCenterSub:
      'Inspect live background tasks, Agent 1 to Agent 2 structured JSON handoffs, retries, and source verification logs.',
    refreshTasksBtn: 'Refresh Tasks',
    noTasksTitle: 'No agent tasks executed yet',
    devSandboxTitle: 'Developer Mode — Two-Agent Test Sandbox',
    devSandboxSub:
      'Test Agent 1 live grounding and Agent 2 deterministic rule verification with isolated sandbox profile inputs.',
    runSandboxBtn: 'Run Two-Agent Sandbox Test',

    themeLabel: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    profilePhotoLabel: 'Student Profile Photo',
    profilePhotoHint: 'Upload PNG, JPG, or WEBP (auto-resized for crisp display in your workspace).',
    uploadPhotoBtn: 'Upload Photo',
    removePhotoBtn: 'Remove Photo',
    applicationNumberLabel: 'Application Number / Tracking ID',
    applicationNumberPlaceholder: 'e.g. KA20262700123456 or SSP-2026-88412',
    saveAppNumberBtn: 'Save Application No.',
    appNumberSavedBadge: 'Saved',
    notEnteredLabel: 'Not entered',

    retryTaskBtn: 'Retry Task',
    retryingTaskBtn: 'Retrying...',
    forceRefreshResearch: 'Bypass verified cache & run fresh search',
    quotaAlertTitle: 'Gemini API Quota or Billing Attention Required',
    quotaBillingInstructions:
      'Configure a valid billing-enabled GEMINI_API_KEY in Settings > Secrets (or .env), then retry this task below. Cached verified results remain preserved.',
    viewActivityLogsBtn: 'View Activity Logs',
    activeModelLabel: 'Model',
    agent2SkippedNote: 'Skipped — Agent 2 only runs when Agent 1 supplies verified research data.',
  },

  kn: {
    navHowItWorks: 'ಕಾರ್ಯವಿಧಾನ',
    navTwoAgents: 'ದ್ವಿ-ಏಜೆಂಟ್ ಎಂಜಿನ್',
    navPortals: 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳು',
    navSafeguards: 'ಸುರಕ್ಷತೆ',
    getStarted: 'ಪ್ರಾರಂಭಿಸಿ',
    signInWorkspace: 'ಲಾಗಿನ್ ಆಗಿ',
    heroKicker: 'ScholarAI – ನಿಮ್ಮ ಭವಿಷ್ಯಕ್ಕೆ ಆರ್ಥಿಕ ನೆರವು · ರಾಷ್ಟ್ರೀಯ ಮತ್ತು ರಾಜ್ಯ ವಿದ್ಯಾರ್ಥಿವೇತನ ವೇದಿಕೆ',
    heroTitle: 'ನೈಜ ಸರ್ಕಾರಿ ನಿಯಮಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿದ ಅಧಿಕೃತ ಭಾರತೀಯ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳನ್ನು ಹುಡುಕಿ.',
    heroSubtitle:
      'ಭಾರತೀಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ ಎರಡು ಸ್ವಾಯತ್ತ AI ಏಜೆಂಟ್‌ಗಳ ಆಧಾರದ ಮೇಲೆ ನಿರ್ಮಿಸಲಾಗಿದೆ. ಏಜೆಂಟ್ 1 NSP ಮತ್ತು ಕರ್ನಾಟಕ SSP ನಂತಹ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ಗಳನ್ನು ನೇರವಾಗಿ ಸಂಶೋಧಿಸುತ್ತದೆ, ಮತ್ತು ಏಜೆಂಟ್ 2 ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಅನ್ನು ನಿಖರ ನಿಯಮಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ ಹಂತ-ಹಂತದ ಅರ್ಜಿ ಯೋಜನೆಯನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತದೆ.',
    heroCaptionTitle: 'ಪುರಾವೆ-ಆಧಾರಿತ ಸಂಶೋಧನೆ',
    heroCaptionBody:
      'ಪ್ರತಿ ಯೋಜನೆಯು ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಲಿಂಕ್, ಪರಿಶೀಲಿಸಿದ ಸಮಯ ಮತ್ತು ನಿಯಮಗಳ ವಿವರಣೆಯನ್ನು ತೋರಿಸುತ್ತದೆ.',
    statAgentsTitle: 'ಸ್ವಾಯತ್ತ AI ಏಜೆಂಟ್‌ಗಳು',
    statAgentsDesc: 'ಸಂಶೋಧನೆ (ಏಜೆಂಟ್ 1) ಮತ್ತು ಅರ್ಹತೆ ಹಾಗೂ ಯೋಜನೆ (ಏಜೆಂಟ್ 2) ನಡುವೆ ಸ್ಪಷ್ಟ ವಿಭಜನೆ.',
    statOutcomesTitle: 'ನಿಖರ ಅರ್ಹತಾ ಫಲಿತಾಂಶಗಳು',
    statOutcomesDesc: 'ಅರ್ಹರಾಗುವ ಸಾಧ್ಯತೆ, ಅನರ್ಹ ಅಥವಾ ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯವಿದೆ—ಯಾವುದೇ ಊಹೆಗಳಿಲ್ಲ.',
    statApprovalTitle: 'ಮಾನವ ಅನುಮೋದನೆ ಗೇಟ್',
    statApprovalDesc: 'ಯೋಜನೆ ಮತ್ತು ದಾಖಲೆ ಪಟ್ಟಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತದೆ; ಬಾಹ್ಯ ಅರ್ಜಿಗೆ ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ಕಡ್ಡಾಯ.',
    statTablesTitle: 'ಶಾಶ್ವತ ಡೇಟಾಬೇಸ್ ಕೋಷ್ಟಕಗಳು',
    statTablesDesc: 'ಪ್ರೊಫೈಲ್, ಅಧಿಕೃತ ಮೂಲಗಳು, ಏಜೆಂಟ್ ಸಂದೇಶಗಳು ಮತ್ತು ದಾಖಲೆ ಪಟ್ಟಿಗಳು ಸುರಕ್ಷಿತವಾಗಿ ಸಂಗ್ರಹವಾಗುತ್ತವೆ.',
    twoAgentsHeading: 'ಎರಡು ಸ್ವಾಯತ್ತ ಏಜೆಂಟ್‌ಗಳು ಹೇಗೆ ಒಟ್ಟಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತವೆ',
    twoAgentsSubheading:
      'ScholarAI ರಚನಾತ್ಮಕ JSON ಸಂದೇಶಗಳ ಮೂಲಕ ಎರಡು ವಿಶೇಷ ಏಜೆಂಟ್‌ಗಳನ್ನು ಸಂಯೋಜಿಸುತ್ತದೆ.',
    agent1Label: '01. ಏಜೆಂಟ್ 1 — ಸಂಶೋಧನಾ ಏಜೆಂಟ್',
    agent1Title: 'ನೇರ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಸಂಶೋಧನೆ',
    agent1Body:
      'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ವೆಬ್‌ಸೈಟ್‌ಗಳಲ್ಲಿ Gemini ನೇರ ಹುಡುಕಾಟವನ್ನು ನಡೆಸಿ, ಅರ್ಹತೆ, ಆದಾಯ ಮಿತಿ, ಕೊನೆಯ ದಿನಾಂಕ ಮತ್ತು ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ಸಂಗ್ರಹಿಸುತ್ತದೆ.',
    agent1Bullets: [
      'ದೃಢೀಕರಿಸದ ದಿನಾಂಕ, ಮೊತ್ತ ಅಥವಾ ಲಿಂಕ್ ಅನ್ನು "Not verified" ಎಂದು ಸ್ಪಷ್ಟವಾಗಿ ತೋರಿಸುತ್ತದೆ.',
      'ಹಳೆಯ ಶೈಕ್ಷಣಿಕ ವರ್ಷದ ಗಡುವನ್ನು ಗುರುತಿಸಿ ಅಧಿಕೃತ ಲಿಂಕ್‌ಗಳನ್ನು ಲಗತ್ತಿಸುತ್ತದೆ.',
      'ಏಜೆಂಟ್ 2 ಗೆ ರಚನಾತ್ಮಕ JSON ಪ್ಯಾಕೇಜ್ (RESEARCH_RESULT_BUNDLE) ಕಳುಹಿಸುತ್ತದೆ.',
    ],
    agent2Label: '02. ಏಜೆಂಟ್ 2 — ಅರ್ಹತೆ ಮತ್ತು ಅರ್ಜಿ ಯೋಜನಾ ಏಜೆಂಟ್',
    agent2Title: 'ನಿಯಮ-ಆಧಾರಿತ ಪರಿಶೀಲನೆ ಮತ್ತು ಅರ್ಜಿ ಯೋಜಕ',
    agent2Body:
      'ಏಜೆಂಟ್ 1 ರಿಂದ ಬಂದ ಮಾಹಿತಿಯನ್ನು ಪಡೆದು, ನಿಮ್ಮ ರಾಜ್ಯ, ವರ್ಗ, ಕುಟುಂಬದ ಆದಾಯ, ಕೋರ್ಸ್ ಮತ್ತು ಅಂಕಗಳ ವಿರುದ್ಧ ನಿಖರ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ.',
    agent2Bullets: [
      'ಪ್ರತಿ ನಿಯಮವು ಏಕೆ ಹೊಂದಾಣಿಕೆಯಾಗಿದೆ ಅಥವಾ ವಿಫಲವಾಗಿದೆ ಎಂಬುದನ್ನು ವಿವರಿಸುತ್ತದೆ.',
      'ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ ಹಂತ-ಹಂತದ ಅರ್ಜಿ ಯೋಜನೆ ಮತ್ತು ದಾಖಲೆ ಪಟ್ಟಿಯನ್ನು ರಚಿಸುತ್ತದೆ.',
      'ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆಯುವ ಮೊದಲು ನಿಮ್ಮ ಸ್ಪಷ್ಟ ಅನುಮೋದನೆಯನ್ನು ಕೇಳುತ್ತದೆ.',
    ],
    portalsHeading: 'ಆದ್ಯತೆ ನೀಡಲಾದ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ಗಳು',
    portalsSubheading:
      'ಏಜೆಂಟ್ 1 ಅನಧಿಕೃತ ಬ್ಲಾಗ್‌ಗಳ ಬದಲಿಗೆ ನೇರವಾಗಿ ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಸರ್ಕಾರದ ಪೋರ್ಟಲ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ:',
    safeguardsBadge: 'ಶೂನ್ಯ-ಕಲ್ಪನೆ ಮತ್ತು ಮಾನವ-ನಿಯಂತ್ರಣ ಭರವಸೆ',
    safeguardsHeading: 'ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ನೀವು ಪರಿಶೀಲಿಸಬಹುದಾದ ಪಾರದರ್ಶಕ ವಿಶ್ಲೇಷಣೆ',
    safeguardsBody:
      'ScholarAI ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಯಾವುದೇ ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸುವುದಿಲ್ಲ, ಸುಳ್ಳು ಗಡುವುಗಳನ್ನು ಸೃಷ್ಟಿಸುವುದಿಲ್ಲ ಮತ್ತು ಪ್ರತ್ಯೇಕ ಡೆವಲಪರ್ ಪರೀಕ್ಷಾ ಮೋಡ್ ಹೊಂದಿದೆ.',
    createStudentAccount: 'ವಿದ್ಯಾರ್ಥಿ ಖಾತೆ ತೆರೆಯಿರಿ',
    footerDisclaimer:
      'ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅಂತಿಮ ದಿನಾಂಕಗಳನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',

    backHome: 'ScholarAI ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
    authRegisterTitle: 'ವಿದ್ಯಾರ್ಥಿ ಖಾತೆ ರಚಿಸಿ',
    authLoginTitle: 'ScholarAI ಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ',
    authRegisterSub: 'ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ ಮತ್ತು ಎರಡು ಏಜೆಂಟ್‌ಗಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ.',
    authLoginSub: 'ನಿಮ್ಮ ಉಳಿಸಿದ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು ಮತ್ತು ಅರ್ಜಿ ಯೋಜನೆಗಳನ್ನು ಪ್ರವೇಶಿಸಿ.',
    registerTab: 'ನೋಂದಣಿ',
    signInTab: 'ಸೈನ್ ಇನ್',
    fullNameLabel: 'ಪೂರ್ಣ ಹೆಸರು',
    emailLabel: 'ಇಮೇಲ್ ವಿಳಾಸ',
    passwordLabel: 'ಪಾಸ್‌ವರ್ಡ್',
    passwordHint: 'ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳು',
    createAndEnter: 'ಖಾತೆ ರಚಿಸಿ ಮತ್ತು ಪ್ರವೇಶಿಸಿ',
    signInBtn: 'ಸೈನ್ ಇನ್ ಮಾಡಿ',
    pleaseWait: 'ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ...',
    authSecurityNote:
      'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಮತ್ತು ಭದ್ರತಾ ಉತ್ತರಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಹ್ಯಾಶ್ ಮಾಡಲಾಗುತ್ತದೆ. ಸೆಷನ್ ಟೋಕನ್‌ಗಳು ಮೆಮೊರಿಯಲ್ಲಿ ಮಾತ್ರ ಇರುತ್ತವೆ.',
    forgotPasswordLink: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೀರಾ?',
    forgotPasswordTitle: 'ಭದ್ರತಾ ಪ್ರಶ್ನೆಗಳ ಮೂಲಕ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
    forgotPasswordSub:
      'ನಿಮ್ಮ ನೋಂದಾಯಿತ ಇಮೇಲ್ ನಮೂದಿಸಿ ಮತ್ತು ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಲು ನಿಮ್ಮ 3 ವೈಯಕ್ತಿಕ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ.',
    continueResetBtn: 'ನನ್ನ ಭದ್ರತಾ ಪ್ರಶ್ನೆಗಳನ್ನು ತೋರಿಸಿ',
    loadingQuestionsBtn: 'ಪ್ರಶ್ನೆಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...',
    securityQuestionsTitle: 'ವೈಯಕ್ತಿಕ ಭದ್ರತಾ ಪ್ರಶ್ನೆಗಳು (ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಲು ಅಗತ್ಯ)',
    securityQuestionsSub:
      '3 ವಿಭಿನ್ನ ವೈಯಕ್ತಿಕ ಪ್ರಶ್ನೆಗಳನ್ನು ಆರಿಸಿ ಮತ್ತು ನೆನಪಿರುವ ಉತ್ತರಗಳನ್ನು ನಮೂದಿಸಿ.',
    question1Label: 'ಭದ್ರತಾ ಪ್ರಶ್ನೆ 1',
    question2Label: 'ಭದ್ರತಾ ಪ್ರಶ್ನೆ 2',
    question3Label: 'ಭದ್ರತಾ ಪ್ರಶ್ನೆ 3',
    answerPlaceholder: 'ನಿಮ್ಮ ಉತ್ತರ ನಮೂದಿಸಿ (ಕನಿಷ್ಠ 2 ಅಕ್ಷರಗಳು)',
    answerPromptLabel: 'ನಿಮ್ಮ ಉತ್ತರ',
    newPasswordLabel: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
    confirmPasswordLabel: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
    resetPasswordBtn: 'ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
    backToSignIn: 'ಸೈನ್ ಇನ್‌ಗೆ ಹಿಂತಿರುಗಿ',
    securityQuestionLabels: {
      birth_city: 'ನೀವು ಹುಟ್ಟಿದ ನಗರ ಅಥವಾ ಪಟ್ಟಣ ಯಾವುದು?',
      first_school: 'ನಿಮ್ಮ ಮೊದಲ ಪ್ರಾಥಮಿಕ ಶಾಲೆಯ ಹೆಸರೇನು?',
      childhood_nickname: 'ನಿಮ್ಮ ಬಾಲ್ಯದ ಅಡ್ಡಹೆಸರು (Nickname) ಏನು?',
      mother_name: 'ನಿಮ್ಮ ತಾಯಿಯ ಮೊದಲ ಹೆಸರೇನು?',
      favorite_teacher: 'ನಿಮ್ಮ ನೆಚ್ಚಿನ ಶಾಲಾ ಶಿಕ್ಷಕರ ಹೆಸರೇನು?',
      favorite_pet_or_book: 'ನಿಮ್ಮ ಬಾಲ್ಯದ ನೆಚ್ಚಿನ ಪುಸ್ತಕ ಅಥವಾ ಸಾಕುಪ್ರಾಣಿಯ ಹೆಸರೇನು?',
    },

    navDashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    navDiscovery: 'ನೇರ ಹುಡುಕಾಟ',
    navSaved: 'ಉಳಿಸಿದ ಯೋಜನೆಗಳು',
    navAgents: 'ಏಜೆಂಟ್ ಚಟುವಟಿಕೆ',
    navProfile: 'ವಿದ್ಯಾರ್ಥಿ ಪ್ರೊಫೈಲ್',
    navDeveloper: 'ಡೆವಲಪರ್ ಮೋಡ್',
    signOut: 'ಸೈನ್ ಔಟ್',
    discoverSchemesBtn: 'ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ',
    languageLabel: 'ಭಾಷೆ',

    dashTitle: 'ವೈಯಕ್ತಿಕ ವಿದ್ಯಾರ್ಥಿವೇತನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    dashSub: 'ಇಲ್ಲಿ ತೋರಿಸಿರುವ ಎಲ್ಲಾ ಸಂಖ್ಯೆಗಳು ನಿಮ್ಮ ಖಾತೆಗಾಗಿ ಸಂಗ್ರಹಿಸಿದ ನೈಜ ದಾಖಲೆಗಳನ್ನು ಆಧರಿಸಿವೆ.',
    metricRetrieved: 'ಪಡೆದ ಯೋಜನೆಗಳು',
    metricLikelyEligible: 'ಅರ್ಹರಾಗುವ ಸಾಧ್ಯತೆ',
    metricNeedsInfo: 'ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಬೇಕು',
    metricSaved: 'ಉಳಿಸಿದ ಯೋಜನೆಗಳು',
    metricAllMatched: 'ಎಲ್ಲಾ ಪರಿಶೀಲಿಸಿದ ನಿಯಮಗಳು ಹೊಂದಿಕೆಯಾಗಿವೆ',
    metricMissingFields: 'ಪ್ರೊಫೈಲ್ ವಿವರ ಅಪೂರ್ಣ ಅಥವಾ ನಿಯಮ ಅಸ್ಪಷ್ಟ',
    metricWithChecklists: 'ದಾಖಲೆ ಪಟ್ಟಿಯೊಂದಿಗೆ ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗಿದೆ',
    emptyDashTitle: 'ಇನ್ನೂ ಯಾವುದೇ ವಿದ್ಯಾರ್ಥಿವೇತನ ಸಂಶೋಧಿಸಿಲ್ಲ',
    emptyDashBody:
      'ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ನೈಜ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಪಡೆಯಲು ನೇರ ಹುಡುಕಾಟದಲ್ಲಿ ಏಜೆಂಟ್ 1 ಮತ್ತು 2 ಅನ್ನು ಪ್ರಾರಂಭಿಸಿ.',
    completeProfileBtn: 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ',
    launchDiscoveryBtn: 'ನೇರ ಹುಡುಕಾಟ ಪ್ರಾರಂಭಿಸಿ',
    outcomeDistTitle: 'ಅರ್ಹತಾ ಫಲಿತಾಂಶಗಳ ವಿತರಣೆ',
    outcomeDistSub: 'ಪಡೆದ ಯೋಜನೆಗಳ ಮೇಲೆ ನಿಯಮ-ಆಧಾರಿತ ಎಂಜಿನ್ ಲೆಕ್ಕಹಾಕಿದ ಫಲಿತಾಂಶಗಳು.',
    deadlineTrackerTitle: 'ಕೊನೆಯ ದಿನಾಂಕ ಮತ್ತು ಪ್ರಮುಖ ಯೋಜನೆಗಳು',

    outcomeLikelyEligible: 'ಅರ್ಹರಾಗುವ ಸಾಧ್ಯತೆ (Likely Eligible)',
    outcomeNotEligible: 'ಅನರ್ಹ (Not Eligible)',
    outcomeNeedsInfo: 'ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯವಿದೆ (Needs More Information)',

    discoveryTitle: 'ನೇರ ವಿದ್ಯಾರ್ಥಿವೇತನ ಹುಡುಕಾಟ',
    discoverySub:
      'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ಗಳನ್ನು ಹುಡುಕಲು ಏಜೆಂಟ್ 1 ಅನ್ನು ಕಳುಹಿಸಿ ಮತ್ತು ಏಜೆಂಟ್ 2 ರ ಅರ್ಹತಾ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.',
    searchQueryLabel: 'ವಿದ್ಯಾರ್ಥಿವೇತನ ವಿಷಯ / ಪೋರ್ಟಲ್ ಹುಡುಕಾಟ',
    searchQueryPlaceholder: 'ಉದಾ: ಕರ್ನಾಟಕ SSP OBC ಎಂಜಿನಿಯರಿಂಗ್ ವಿದ್ಯಾರ್ಥಿವೇತನ',
    targetStateLabel: 'ರಾಜ್ಯ',
    categoryLabel: 'ವರ್ಗ',
    runAgentsBtn: 'ಏಜೆಂಟ್ 1 ಮತ್ತು 2 ಚಲಾಯಿಸಿ',
    filterStatePlaceholder: 'ರಾಜ್ಯ ಫಿಲ್ಟರ್...',
    filterCategoryPlaceholder: 'ವರ್ಗ ಫಿಲ್ಟರ್...',
    filterEduPlaceholder: 'ಶಿಕ್ಷಣ ಮಟ್ಟ...',
    filterCoursePlaceholder: 'ಕೋರ್ಸ್ ಫಿಲ್ಟರ್...',
    allOutcomesOption: 'ಎಲ್ಲಾ ಅರ್ಹತಾ ಫಲಿತಾಂಶಗಳು',
    allStagesOption: 'ಎಲ್ಲಾ ಅರ್ಜಿ ಹಂತಗಳು',
    withinIncomeCheck: 'ನನ್ನ ಕುಟುಂಬದ ಆದಾಯ ಮಿತಿಯೊಳಗಿರುವ ಯೋಜನೆಗಳು ಮಾತ್ರ',
    includeTestCheck: 'ಡೆವಲಪರ್ ಪರೀಕ್ಷಾ ದಾಖಲೆಗಳನ್ನು ತೋರಿಸಿ',
    noSchemesFound:
      'ಪ್ರಸ್ತುತ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಮೇಲೆ ಏಜೆಂಟ್ 1 ಮತ್ತು 2 ಅನ್ನು ಚಲಾಯಿಸಿ.',
    benefitsLabel: 'ಪ್ರಯೋಜನಗಳು',
    deadlineLabel: 'ಕೊನೆಯ ದಿನಾಂಕ',
    incomeLimitLabel: 'ಆದಾಯ ಮಿತಿ',
    lastVerifiedLabel: 'ಕೊನೆಯ ಪರಿಶೀಲನೆ',
    sourceBtn: 'ಮೂಲ',
    inspectPlanBtn: 'ನಿಯಮಗಳು ಮತ್ತು ಯೋಜನೆ ನೋಡಿ',

    savedTitle: 'ಉಳಿಸಿದ ಯೋಜನೆಗಳು ಮತ್ತು ಅರ್ಜಿ ಪ್ರಗತಿ',
    savedSub: 'ನಿಮ್ಮ ದಾಖಲೆ ಪಟ್ಟಿ, ಕೊನೆಯ ದಿನಾಂಕಗಳು ಮತ್ತು ಪೋರ್ಟಲ್ ಅನುಮೋದನೆಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.',
    noSavedBody:
      'ಇನ್ನೂ ಯಾವುದೇ ಯೋಜನೆಯನ್ನು ಉಳಿಸಿಲ್ಲ. ಉಳಿಸಲು ಅಥವಾ ದಾಖಲೆಗಳನ್ನು ಗುರುತಿಸಲು ನೇರ ಹುಡುಕಾಟದಲ್ಲಿ ಯೋಜನೆಯನ್ನು ತೆರೆಯಿರಿ.',
    documentsLabel: 'ದಾಖಲೆಗಳು',
    actionStepsLabel: 'ಹಂತಗಳು',
    openChecklistBtn: 'ದಾಖಲೆ ಪಟ್ಟಿ ಮತ್ತು ಯೋಜನೆ ತೆರೆಯಿರಿ',
    portalApprovedNote: 'ನೀವು ಪೋರ್ಟಲ್ ಅನುಮೋದಿಸಿದ್ದೀರಿ',
    awaitingReviewNote: 'ನಿಮ್ಮ ಪರಿಶೀಲನೆಗೆ ಕಾಯುತ್ತಿದೆ',

    profileTitle: 'ವಿದ್ಯಾರ್ಥಿ ಪ್ರೊಫೈಲ್',
    profileSub:
      'ಏಜೆಂಟ್ 2 ಈ ವಿವರಗಳ ಆಧಾರದ ಮೇಲೆ ಅರ್ಹತೆಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ. ಅಗತ್ಯ ಕ್ಷೇತ್ರಗಳು ಖಾಲಿ ಇದ್ದರೆ "ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಅಗತ್ಯವಿದೆ" ಎಂದು ತೋರಿಸಲಾಗುತ್ತದೆ.',
    profileSavedBanner:
      'ಪ್ರೊಫೈಲ್ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ. ಈಗ ನೀವು ಯಾವುದೇ ಯೋಜನೆಯ ಅರ್ಹತೆಯನ್ನು ಮರುಪರಿಶೀಲಿಸಬಹುದು.',
    saveProfileBtn: 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ',
    savingProfileBtn: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...',

    schemeOverviewTitle: 'ಯೋಜನೆಯ ವಿವರಣೆ',
    agent2BreakdownTitle: 'ಏಜೆಂಟ್ 2 — ನಿಯಮ-ಆಧಾರಿತ ಅರ್ಹತಾ ವಿಶ್ಲೇಷಣೆ',
    recheckRulesBtn: 'ಪ್ರೊಫೈಲ್ ನಿಯಮ ಮರುಪರಿಶೀಲಿಸಿ',
    appPlanTitle: 'ವೈಯಕ್ತಿಕ ಅರ್ಜಿ ಯೋಜನೆ ಮತ್ತು ದಾಖಲೆ ಪಟ್ಟಿ',
    actionPlanHeading: 'ಹಂತ-ಹಂತದ ಕ್ರಿಯಾ ಯೋಜನೆ',
    docChecklistHeading: 'ಅಗತ್ಯ ದಾಖಲೆಗಳ ಪಟ್ಟಿ',
    humanApprovalRequiredTitle: 'ಬಾಹ್ಯ ಪೋರ್ಟಲ್ ತೆರೆಯುವ ಮೊದಲು ನಿಮ್ಮ ಸ್ಪಷ್ಟ ಅನುಮೋದನೆ ಅಗತ್ಯವಿದೆ',
    humanApprovalRecordedTitle: 'ಮಾನವ ಅನುಮೋದನೆ ದಾಖಲಾಗಿದೆ — ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆಯಲು ಸಿದ್ಧ',
    reviewApproveBtn: 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪೋರ್ಟಲ್ ಅನುಮೋದಿಸಿ',
    openOfficialPortalBtn: 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ',
    confirmUnlockBtn: 'ಖಚಿತಪಡಿಸಿ ಮತ್ತು ಲಿಂಕ್ ತೆರೆಯಿರಿ',
    sourceEvidenceTitle: 'ಅಧಿಕೃತ ಮೂಲ ಪುರಾವೆ ಫಲಕ',

    agentCenterTitle: 'AI ಏಜೆಂಟ್ ಚಟುವಟಿಕೆ ಕೇಂದ್ರ',
    agentCenterSub:
      'ಹಿನ್ನೆಲೆ ಕಾರ್ಯಗಳು, ಏಜೆಂಟ್ 1 ರಿಂದ ಏಜೆಂಟ್ 2 JSON ಸಂದೇಶಗಳು ಮತ್ತು ದೋಷ ಲಾಗ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ.',
    refreshTasksBtn: 'ರಿಫ್ರೆಶ್ ಮಾಡಿ',
    noTasksTitle: 'ಇನ್ನೂ ಯಾವುದೇ ಏಜೆಂಟ್ ಕಾರ್ಯ ನಡೆದಿಲ್ಲ',
    devSandboxTitle: 'ಡೆವಲಪರ್ ಮೋಡ್ — ದ್ವಿ-ಏಜೆಂಟ್ ಪರೀಕ್ಷಾ ಸ್ಯಾಂಡ್‌ಬಾಕ್ಸ್',
    devSandboxSub:
      'ಪ್ರತ್ಯೇಕ ಪರೀಕ್ಷಾ ಪ್ರೊಫೈಲ್ ಬಳಸಿ ಏಜೆಂಟ್ 1 ಮತ್ತು ಏಜೆಂಟ್ 2 ಕಾರ್ಯನಿರ್ವಹಣೆಯನ್ನು ಪರೀಕ್ಷಿಸಿ.',
    runSandboxBtn: 'ಸ್ಯಾಂಡ್‌ಬಾಕ್ಸ್ ಪರೀಕ್ಷೆ ಚಲಾಯಿಸಿ',

    themeLabel: 'ಥೀಮ್',
    themeLight: 'ಲೈಟ್',
    themeDark: 'ಡಾರ್ಕ್',
    profilePhotoLabel: 'ವಿದ್ಯಾರ್ಥಿ ಪ್ರೊಫೈಲ್ ಫೋಟೋ',
    profilePhotoHint: 'PNG, JPG ಅಥವಾ WEBP ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ (ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗಾತ್ರ ಸರಿಹೊಂದಿಸಲಾಗುತ್ತದೆ).',
    uploadPhotoBtn: 'ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    removePhotoBtn: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    applicationNumberLabel: 'ಅರ್ಜಿ ಸಂಖ್ಯೆ / ಟ್ರ್ಯಾಕಿಂಗ್ ಐಡಿ',
    applicationNumberPlaceholder: 'ಉದಾ: KA20262700123456 ಅಥವಾ SSP-2026-88412',
    saveAppNumberBtn: 'ಅರ್ಜಿ ಸಂಖ್ಯೆ ಉಳಿಸಿ',
    appNumberSavedBadge: 'ಉಳಿಸಲಾಗಿದೆ',
    notEnteredLabel: 'ನಮೂದಿಸಿಲ್ಲ',

    retryTaskBtn: 'ಕಾರ್ಯವನ್ನು ಮರುಪ್ರಯತ್ನಿಸಿ',
    retryingTaskBtn: 'ಮರುಪ್ರಯತ್ನಿಸಲಾಗುತ್ತಿದೆ...',
    forceRefreshResearch: 'ಕ್ಯಾಶ್ ಬೈಪಾಸ್ ಮಾಡಿ ಹೊಸ ಹುಡುಕಾಟ ನಡೆಸಿ',
    quotaAlertTitle: 'Gemini API ಕೋಟಾ ಅಥವಾ ಬಿಲ್ಲಿಂಗ್ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ',
    quotaBillingInstructions:
      'Settings > Secrets (ಅಥವಾ .env) ನಲ್ಲಿ ಮಾನ್ಯವಾದ ಬಿಲ್ಲಿಂಗ್-ಸಕ್ರಿಯ GEMINI_API_KEY ಅನ್ನು ಹೊಂದಿಸಿ, ನಂತರ ಈ ಕಾರ್ಯವನ್ನು ಮರುಪ್ರಯತ್ನಿಸಿ.',
    viewActivityLogsBtn: 'ಚಟುವಟಿಕೆ ಲಾಗ್ ನೋಡಿ',
    activeModelLabel: 'ಮಾಡೆಲ್',
    agent2SkippedNote: 'ಬಿಟ್ಟುಬಿಡಲಾಗಿದೆ — ಏಜೆಂಟ್ 1 ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ನೀಡಿದಾಗ ಮಾತ್ರ ಏಜೆಂಟ್ 2 ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ.',
  },

  hi: {
    navHowItWorks: 'कार्यप्रणाली',
    navTwoAgents: 'दो-एजेंट इंजन',
    navPortals: 'आधिकारिक पोर्टल',
    navSafeguards: 'सुरक्षा नियम',
    getStarted: 'शुरू करें',
    signInWorkspace: 'साइन इन करें',
    heroKicker: 'ScholarAI – आपका भविष्य, सुरक्षित · राष्ट्रीय एवं राज्य छात्रवृत्ति मंच',
    heroTitle: 'वास्तविक सरकारी नियमों से सत्यापित आधिकारिक भारतीय छात्रवृत्तियाँ खोजें।',
    heroSubtitle:
      'भारतीय छात्रों के लिए दो स्वायत्त AI एजेंटों की प्रणाली पर आधारित। एजेंट 1 NSP और कर्नाटक SSP जैसे आधिकारिक सरकारी पोर्टलों पर लाइव शोध करता है, जबकि एजेंट 2 आपकी प्रोफ़ाइल की नियम-आधारित पात्रता जाँचकर चरण-दर-चरण आवेदन योजना बनाता है—बिना किसी अनुमान या आपकी अनुमति के बिना आवेदन सबमिट किए।',
    heroCaptionTitle: 'साक्ष्य-आधारित खोज',
    heroCaptionBody:
      'प्रत्येक योजना अपना आधिकारिक पोर्टल लिंक, अंतिम सत्यापन समय और नियम विश्लेषण दिखाती है।',
    statAgentsTitle: 'स्वायत्त AI एजेंट',
    statAgentsDesc: 'शोध (एजेंट 1) और पात्रता एवं योजना (एजेंट 2) के बीच स्पष्ट विभाजन।',
    statOutcomesTitle: 'नियम-आधारित परिणाम',
    statOutcomesDesc: 'संभावित पात्र, अपात्र या अधिक जानकारी आवश्यक—कोई अनुमान नहीं।',
    statApprovalTitle: 'मानव स्वीकृति गेट',
    statApprovalDesc: 'योजना और दस्तावेज़ सूची तैयार की जाती है; बाहरी पोर्टल के लिए आपकी सहमति अनिवार्य है।',
    statTablesTitle: 'स्थायी डेटाबेस तालिकाएँ',
    statTablesDesc: 'प्रोफ़ाइल, आधिकारिक स्रोत, एजेंट संदेश और चेकलिस्ट सुरक्षित रूप से सहेजे जाते हैं।',
    twoAgentsHeading: 'दोनों स्वायत्त एजेंट मिलकर कैसे काम करते हैं',
    twoAgentsSubheading:
      'ScholarAI संरचित JSON एजेंट-टू-एजेंट (A2A) संदेशों के माध्यम से दोनों एजेंटों का समन्वय करता है।',
    agent1Label: '01. एजेंट 1 — शोध एजेंट',
    agent1Title: 'आधिकारिक पोर्टल पर लाइव खोज एवं सत्यापन',
    agent1Body:
      'आधिकारिक सरकारी वेबसाइटों पर Gemini लाइव सर्च ग्राउंडिंग चलाता है और पात्रता, आय सीमा, अंतिम तिथि व आवश्यक दस्तावेज़ निकालता है।',
    agent1Bullets: [
      'असत्यापित तिथि, राशि या लिंक को स्पष्ट रूप से "Not verified" चिह्नित करता है।',
      'पुराने शैक्षणिक चक्र की समय-सीमा की पहचान कर आधिकारिक URL जोड़ता है।',
      'एजेंट 2 को संरचित JSON पैकेज (RESEARCH_RESULT_BUNDLE) भेजता है।',
    ],
    agent2Label: '02. एजेंट 2 — पात्रता एवं आवेदन योजना एजेंट',
    agent2Title: 'नियम-आधारित जाँच और व्यक्तिगत आवेदन योजनाकार',
    agent2Body:
      'एजेंट 1 से प्राप्त शोध के आधार पर आपकी प्रोफ़ाइल (राज्य, श्रेणी, पारिवारिक आय, शिक्षा स्तर, अंक और पाठ्यक्रम) की सटीक नियमों से तुलना करता है।',
    agent2Bullets: [
      'प्रत्येक शर्त के पास, फेल या अधूरे होने का स्पष्ट कारण बताता है।',
      'व्यक्तिगत चरण-दर-चरण आवेदन योजना और दस्तावेज़ चेकलिस्ट बनाता है।',
      'बाहरी सरकारी पोर्टल खोलने से पहले आपकी स्पष्ट मानव स्वीकृति माँगता है।',
    ],
    portalsHeading: 'प्राथमिकता प्राप्त आधिकारिक सरकारी पोर्टल',
    portalsSubheading:
      'एजेंट 1 असत्यापित ब्लॉगों के बजाय सीधे केंद्र और राज्य सरकार के आधिकारिक पोर्टलों को प्राथमिकता देता है:',
    safeguardsBadge: 'शून्य-कल्पना और मानव-नियंत्रण गारंटी',
    safeguardsHeading: 'आवेदन करने से पहले जाँच योग्य पारदर्शी तर्क',
    safeguardsBody:
      'ScholarAI कभी भी स्वतः आवेदन जमा नहीं करता, नकली तिथियाँ नहीं बनाता, और स्थानीय Windows/MySQL उपयोग के लिए पूर्ण Python कोड के साथ डेवलपर सैंडबॉक्स प्रदान करता है।',
    createStudentAccount: 'छात्र खाता बनाएँ',
    footerDisclaimer:
      'आवेदन जमा करने से पहले आधिकारिक सरकारी पोर्टल पर अंतिम तिथियों की पुष्टि अवश्य करें।',

    backHome: 'ScholarAI होम पर वापस जाएँ',
    authRegisterTitle: 'छात्र खाता बनाएँ',
    authLoginTitle: 'ScholarAI में साइन इन करें',
    authRegisterSub: 'अपनी प्रोफ़ाइल सहेजें और एजेंट 1 व एजेंट 2 से लाइव पात्रता जाँचें।',
    authLoginSub: 'अपनी सहेजी गई छात्रवृत्तियाँ, पात्रता रिपोर्ट और आवेदन योजनाएँ देखें।',
    registerTab: 'पंजीकरण',
    signInTab: 'साइन इन',
    fullNameLabel: 'पूरा नाम',
    emailLabel: 'ईमेल पता',
    passwordLabel: 'पासवर्ड',
    passwordHint: 'कम से कम 8 अक्षर',
    createAndEnter: 'खाता बनाएँ और प्रवेश करें',
    signInBtn: 'साइन इन करें',
    pleaseWait: 'कृपया प्रतीक्षा करें...',
    authSecurityNote:
      'पासवर्ड और सुरक्षा उत्तर सर्वर पर सुरक्षित रूप से हैश किए जाते हैं। सेशन टोकन केवल मेमोरी में रहते हैं।',
    forgotPasswordLink: 'पासवर्ड भूल गए?',
    forgotPasswordTitle: 'सुरक्षा प्रश्नों से पासवर्ड रीसेट करें',
    forgotPasswordSub:
      'अपना पंजीकृत ईमेल दर्ज करें और नया पासवर्ड सेट करने के लिए अपने 3 व्यक्तिगत सुरक्षा प्रश्नों का उत्तर दें।',
    continueResetBtn: 'मेरे सुरक्षा प्रश्न देखें',
    loadingQuestionsBtn: 'प्रश्न लोड हो रहे हैं...',
    securityQuestionsTitle: 'व्यक्तिगत सुरक्षा प्रश्न (पासवर्ड रीसेट के लिए आवश्यक)',
    securityQuestionsSub:
      '3 अलग-अलग व्यक्तिगत प्रश्न चुनें और याद रहने वाले उत्तर दर्ज करें।',
    question1Label: 'सुरक्षा प्रश्न 1',
    question2Label: 'सुरक्षा प्रश्न 2',
    question3Label: 'सुरक्षा प्रश्न 3',
    answerPlaceholder: 'अपना उत्तर दर्ज करें (कम से कम 2 अक्षर)',
    answerPromptLabel: 'आपका उत्तर',
    newPasswordLabel: 'नया पासवर्ड',
    confirmPasswordLabel: 'नए पासवर्ड की पुष्टि करें',
    resetPasswordBtn: 'उत्तर सत्यापित करें और पासवर्ड बदलें',
    backToSignIn: 'साइन इन पर वापस जाएँ',
    securityQuestionLabels: {
      birth_city: 'आपका जन्म किस शहर या कस्बे में हुआ था?',
      first_school: 'आपके पहले प्राथमिक विद्यालय का नाम क्या था?',
      childhood_nickname: 'आपके बचपन का उपनाम (Nickname) क्या था?',
      mother_name: 'आपकी माताजी का पहला नाम क्या है?',
      favorite_teacher: 'आपके पसंदीदा स्कूल शिक्षक का नाम क्या था?',
      favorite_pet_or_book: 'आपकी बचपन की पसंदीदा किताब या पालतू जानवर का नाम क्या है?',
    },

    navDashboard: 'डैशबोर्ड',
    navDiscovery: 'लाइव खोज',
    navSaved: 'सहेजी गई योजनाएँ',
    navAgents: 'एजेंट गतिविधि',
    navProfile: 'छात्र प्रोफ़ाइल',
    navDeveloper: 'डेवलपर मोड',
    signOut: 'साइन आउट',
    discoverSchemesBtn: 'योजनाएँ खोजें',
    languageLabel: 'भाषा',

    dashTitle: 'व्यक्तिगत छात्रवृत्ति डैशबोर्ड',
    dashSub: 'सभी आँकड़े आपके खाते के लिए प्राप्त और सहेजे गए वास्तविक सत्यापित रिकॉर्ड दर्शाते हैं।',
    metricRetrieved: 'प्राप्त योजनाएँ',
    metricLikelyEligible: 'संभावित पात्र',
    metricNeedsInfo: 'अधिक जानकारी आवश्यक',
    metricSaved: 'सहेजी गई योजनाएँ',
    metricAllMatched: 'सभी सत्यापित नियम पूरे हुए',
    metricMissingFields: 'प्रोफ़ाइल विवरण अधूरा या नियम असत्यापित',
    metricWithChecklists: 'चेकलिस्ट के साथ ट्रैक किया गया',
    emptyDashTitle: 'अभी तक कोई छात्रवृत्ति नहीं खोजी गई है',
    emptyDashBody:
      'अपनी छात्र प्रोफ़ाइल पूरी करें और वास्तविक सरकारी योजनाएँ प्राप्त करने के लिए लाइव खोज में एजेंट 1 व एजेंट 2 चलाएँ।',
    completeProfileBtn: 'छात्र प्रोफ़ाइल पूरी करें',
    launchDiscoveryBtn: 'लाइव खोज शुरू करें',
    outcomeDistTitle: 'पात्रता नियम परिणाम वितरण',
    outcomeDistSub: 'प्राप्त योजनाओं पर नियम-आधारित इंजन द्वारा गणना किए गए परिणाम।',
    deadlineTrackerTitle: 'अंतिम तिथि ट्रैकर और प्रमुख योजनाएँ',

    outcomeLikelyEligible: 'संभावित पात्र (Likely Eligible)',
    outcomeNotEligible: 'अपात्र (Not Eligible)',
    outcomeNeedsInfo: 'अधिक जानकारी आवश्यक (Needs More Information)',

    discoveryTitle: 'लाइव छात्रवृत्ति खोज',
    discoverySub:
      'आधिकारिक सरकारी पोर्टलों पर शोध के लिए एजेंट 1 भेजें और एजेंट 2 की पात्रता जाँच व योजना देखें।',
    searchQueryLabel: 'छात्रवृत्ति विषय / पोर्टल खोज',
    searchQueryPlaceholder: 'उदा: पोस्ट-मैट्रिक OBC इंजीनियरिंग छात्रवृत्ति NSP और कर्नाटक SSP',
    targetStateLabel: 'राज्य',
    categoryLabel: 'श्रेणी',
    runAgentsBtn: 'एजेंट 1 और 2 चलाएँ',
    filterStatePlaceholder: 'राज्य फ़िल्टर...',
    filterCategoryPlaceholder: 'श्रेणी फ़िल्टर...',
    filterEduPlaceholder: 'शिक्षा स्तर...',
    filterCoursePlaceholder: 'पाठ्यक्रम फ़िल्टर...',
    allOutcomesOption: 'सभी पात्रता परिणाम',
    allStagesOption: 'सभी आवेदन चरण',
    withinIncomeCheck: 'मेरी वार्षिक पारिवारिक आय सीमा के भीतर',
    includeTestCheck: 'डेवलपर सैंडबॉक्स टेस्ट रिकॉर्ड शामिल करें',
    noSchemesFound:
      'वर्तमान फ़िल्टर से कोई योजना मेल नहीं खाती। आधिकारिक योजनाएँ खोजने के लिए ऊपर एजेंट 1 और 2 चलाएँ।',
    benefitsLabel: 'लाभ',
    deadlineLabel: 'अंतिम तिथि',
    incomeLimitLabel: 'आय सीमा',
    lastVerifiedLabel: 'अंतिम सत्यापन',
    sourceBtn: 'स्रोत',
    inspectPlanBtn: 'नियम और योजना देखें',

    savedTitle: 'सहेजी गई योजनाएँ और आवेदन प्रगति',
    savedSub: 'अपनी दस्तावेज़ चेकलिस्ट, आगामी समय-सीमा और पोर्टल स्वीकृतियाँ ट्रैक करें।',
    noSavedBody:
      'अभी तक कोई योजना सहेजी नहीं गई है। सहेजने या दस्तावेज़ जाँचने के लिए लाइव खोज से कोई योजना खोलें।',
    documentsLabel: 'दस्तावेज़',
    actionStepsLabel: 'आवेदन चरण',
    openChecklistBtn: 'चेकलिस्ट और योजना खोलें',
    portalApprovedNote: 'आपके द्वारा पोर्टल स्वीकृत',
    awaitingReviewNote: 'आपकी समीक्षा की प्रतीक्षा में',

    profileTitle: 'छात्र प्रोफ़ाइल',
    profileSub:
      'एजेंट 2 इन विवरणों के आधार पर पात्रता नियमों की जाँच करता है। आवश्यक फ़ील्ड खाली छोड़ने पर योजना "अधिक जानकारी आवश्यक" के रूप में चिह्नित होगी।',
    profileSavedBanner:
      'प्रोफ़ाइल डेटाबेस में सहेजी गई। अब आप किसी भी योजना की पात्रता तुरंत पुनः जाँच सकते हैं।',
    saveProfileBtn: 'छात्र प्रोफ़ाइल सहेजें',
    savingProfileBtn: 'सहेजा जा रहा है...',

    schemeOverviewTitle: 'योजना का विवरण',
    agent2BreakdownTitle: 'एजेंट 2 — नियम-आधारित पात्रता विश्लेषण',
    recheckRulesBtn: 'प्रोफ़ाइल नियम पुनः जाँचें',
    appPlanTitle: 'व्यक्तिगत आवेदन योजना और दस्तावेज़ चेकलिस्ट',
    actionPlanHeading: 'चरण-दर-चरण कार्य योजना',
    docChecklistHeading: 'आवश्यक दस्तावेज़ चेकलिस्ट',
    humanApprovalRequiredTitle: 'बाहरी पोर्टल पर जाने से पहले स्पष्ट मानव स्वीकृति आवश्यक है',
    humanApprovalRecordedTitle: 'मानव स्वीकृति दर्ज — आधिकारिक पोर्टल अनलॉक',
    reviewApproveBtn: 'समीक्षा करें और पोर्टल स्वीकृत करें',
    openOfficialPortalBtn: 'आधिकारिक पोर्टल खोलें',
    confirmUnlockBtn: 'पुष्टि करें और पोर्टल लिंक अनलॉक करें',
    sourceEvidenceTitle: 'आधिकारिक स्रोत साक्ष्य पैनल',

    agentCenterTitle: 'AI एजेंट गतिविधि केंद्र',
    agentCenterSub:
      'लाइव बैकग्राउंड कार्य, एजेंट 1 से एजेंट 2 JSON संदेश, रीट्राई और स्रोत सत्यापन लॉग देखें।',
    refreshTasksBtn: 'रीफ़्रेश करें',
    noTasksTitle: 'अभी तक कोई एजेंट कार्य नहीं चलाया गया है',
    devSandboxTitle: 'डेवलपर मोड — दो-एजेंट टेस्ट सैंडबॉक्स',
    devSandboxSub:
      'अलग टेस्ट प्रोफ़ाइल इनपुट के साथ एजेंट 1 और एजेंट 2 के कार्य का परीक्षण करें।',
    runSandboxBtn: 'सैंडबॉक्स परीक्षण चलाएँ',

    themeLabel: 'थीम',
    themeLight: 'लाइट',
    themeDark: 'डार्क',
    profilePhotoLabel: 'छात्र प्रोफ़ाइल फ़ोटो',
    profilePhotoHint: 'PNG, JPG या WEBP छवि अपलोड करें (कार्यक्षेत्र में स्पष्ट प्रदर्शन हेतु स्वतः आकार समायोजित)।',
    uploadPhotoBtn: 'फ़ोटो अपलोड करें',
    removePhotoBtn: 'फ़ोटो हटाएँ',
    applicationNumberLabel: 'आवेदन संख्या / ट्रैकिंग आईडी',
    applicationNumberPlaceholder: 'उदा: KA20262700123456 या SSP-2026-88412',
    saveAppNumberBtn: 'आवेदन संख्या सहेजें',
    appNumberSavedBadge: 'सहेजा गया',
    notEnteredLabel: 'दर्ज नहीं किया गया',

    retryTaskBtn: 'कार्य पुनः प्रयास करें',
    retryingTaskBtn: 'पुनः प्रयास जारी...',
    forceRefreshResearch: 'सत्यापित कैश छोड़कर नया शोध चलाएँ',
    quotaAlertTitle: 'Gemini API कोटा या बिलिंग जाँच आवश्यक',
    quotaBillingInstructions:
      'Settings > Secrets (या .env) में एक मान्य बिलिंग-सक्षम GEMINI_API_KEY सेट करें, फिर नीचे दिए गए बटन से इस कार्य को पुनः प्रयास करें।',
    viewActivityLogsBtn: 'गतिविधि लॉग देखें',
    activeModelLabel: 'मॉडल',
    agent2SkippedNote: 'रोका गया — एजेंट 2 तभी चलता है जब एजेंट 1 सत्यापित शोध डेटा प्रदान करे।',
  },
};

export function translateOutcome(outcome: string, t: Translations): string {
  if (outcome === 'Likely Eligible') return t.outcomeLikelyEligible;
  if (outcome === 'Not Eligible') return t.outcomeNotEligible;
  return t.outcomeNeedsInfo;
}
