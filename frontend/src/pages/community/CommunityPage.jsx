import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Eye,
  Filter,
  GraduationCap,
  Landmark,
  Leaf,
  MapPin,
  MessageSquareMore,
  Rss,
  Search,
  Send,
  ShieldCheck,
  Sprout,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";

const COMMUNITY_STORAGE_KEY = "agri-feed-community-module-v2";
const DEMO_MODE = true;

const initialData = {
  stats: {
    totalDiscussions: 186,
    activeExperts: 24,
    validatedPractices: 41,
    upcomingEvents: 8,
    knowledgeArticles: 62,
  },
  impactMetrics: {
    practicesAdopted: 1280,
    farmersReached: 6420,
    questionsResolved: 312,
    resourcesShared: 214,
  },
  discussions: [
    {
      id: "discussion-1",
      title: "Optimizing Nitrogen Application in Maize for Gatenga Sector",
      summary: "Farmers are comparing split nitrogen application timing under moderate rainfall variability and looking for the best vegetative-stage strategy.",
      category: "Soil Management",
      crop: "Maize",
      region: "Gatenga Sector, Kicukiro District",
      topic: "Precision Fertilizer",
      expert: "Dr. Alice Uwase",
      replies: 18,
      views: 246,
      likes: 38,
      validationStatus: "Expert Validated",
      postedAt: "Today",
      lastActivity: "2 hours ago",
    },
    {
      id: "discussion-2",
      title: "Managing Fall Armyworm in Eastern Province",
      summary: "Community reports from Bugesera and Rwamagana are comparing scouting intervals, pheromone trap placement, and safe response thresholds.",
      category: "Crop Protection",
      crop: "Maize",
      region: "Nyamata Sector, Bugesera District",
      topic: "Pest Management",
      expert: "Jean Claude Habimana",
      replies: 26,
      views: 411,
      likes: 52,
      validationStatus: "Community Validated",
      postedAt: "Yesterday",
      lastActivity: "6 hours ago",
    },
    {
      id: "discussion-3",
      title: "Climate-Smart Irrigation Scheduling in Bugesera",
      summary: "Producers are comparing water-saving irrigation windows for vegetables under dry spells using short-term forecast trends.",
      category: "Climate Adaptation",
      crop: "Vegetables",
      region: "Nyamata Sector, Bugesera District",
      topic: "Climate-Smart Farming",
      expert: "Ing. Patrick Nshuti",
      replies: 14,
      views: 198,
      likes: 29,
      validationStatus: "Under Review",
      postedAt: "Earlier",
      lastActivity: "1 day ago",
    },
    {
      id: "discussion-4",
      title: "Potato Late Blight Monitoring in Musanze District",
      summary: "Farmers and extension teams are aligning disease scouting frequency with humid weather windows to reduce treatment waste.",
      category: "Crop Protection",
      crop: "Potato",
      region: "Musanze District",
      topic: "Disease Forecasting",
      expert: "Dr. Clementine Mukamana",
      replies: 21,
      views: 305,
      likes: 47,
      validationStatus: "Expert Validated",
      postedAt: "Earlier",
      lastActivity: "2 days ago",
    },
  ],
  questions: [
    {
      id: "question-1",
      question: "What is the best way to time top-dressing in maize when rainfall is expected to be low for the next week?",
      askedBy: "Rodrigue Farmer",
      expert: "Dr. Alice Uwase",
      response: "Apply only the first split now and hold the second split until the first effective rainfall event or irrigation support is confirmed.",
      status: "Answered",
      accepted: true,
      category: "Soil Management",
      postedAt: "Today",
    },
    {
      id: "question-2",
      question: "How can I reduce water use in dry-season vegetable production without losing market quality?",
      askedBy: "Claudine Uwera",
      expert: "Ing. Patrick Nshuti",
      response: "Shift irrigation to early morning, reduce unnecessary leaf wetting, and use mulch to stabilize the root zone.",
      status: "Answered",
      accepted: false,
      category: "Climate Adaptation",
      postedAt: "Yesterday",
    },
  ],
  stories: [
    {
      id: "story-1",
      title: "Increased maize yield by 35% using precision fertilizer recommendations",
      summary: "A cooperative cluster in Rwamagana improved nutrient timing and used advisory-based split nitrogen application.",
      beforeAfter: "Yield improved from 4.2 t/ha to 5.7 t/ha",
      theme: "Innovation Showcase",
      climateSmart: true,
      district: "Rwamagana District",
    },
    {
      id: "story-2",
      title: "Reduced water use by 28% through smart irrigation scheduling",
      summary: "Vegetable growers in Bugesera used forecast-linked irrigation windows to reduce pumping costs and preserve soil moisture.",
      beforeAfter: "Water use dropped from 5.4 mm/day to 3.9 mm/day",
      theme: "Climate-Smart Agriculture",
      climateSmart: true,
      district: "Bugesera District",
    },
    {
      id: "story-3",
      title: "Improved potato disease management using AI alerts",
      summary: "Farmer groups in Musanze aligned fungicide timing with alert thresholds and reduced unnecessary sprays.",
      beforeAfter: "Blight-related loss reduced by 19%",
      theme: "Extension-Led Case Study",
      climateSmart: false,
      district: "Musanze District",
    },
  ],
  events: [
    {
      id: "event-1",
      title: "Maize Nutrient Management Workshop",
      type: "Workshop",
      date: "20 Jun 2026",
      venue: "Kicukiro Youth Center",
      region: "Kigali City",
      registrations: 46,
      seatsLeft: 14,
    },
    {
      id: "event-2",
      title: "Climate-Smart Farming Webinar",
      type: "Webinar",
      date: "24 Jun 2026",
      venue: "Online",
      region: "National",
      registrations: 128,
      seatsLeft: 72,
    },
    {
      id: "event-3",
      title: "Field Demonstration: Smart Irrigation in Bugesera",
      type: "Field Demo",
      date: "28 Jun 2026",
      venue: "Nyamata Demonstration Site",
      region: "Bugesera District",
      registrations: 31,
      seatsLeft: 19,
    },
  ],
  experts: [
    { id: "expert-1", name: "Dr. Alice Uwase", specialty: "Soil Management", organization: "RAB Extension Support", district: "Kigali City" },
    { id: "expert-2", name: "Jean Claude Habimana", specialty: "Crop Protection", organization: "Eastern Province Plant Health Unit", district: "Bugesera District" },
    { id: "expert-3", name: "Ing. Patrick Nshuti", specialty: "Climate Adaptation", organization: "Irrigation Innovation Lab", district: "Huye District" },
    { id: "expert-4", name: "Dr. Clementine Mukamana", specialty: "Plant Pathology", organization: "Northern Highlands Research Team", district: "Musanze District" },
    { id: "expert-5", name: "Vestine Mukeshimana", specialty: "Agribusiness", organization: "Market Intelligence Desk", district: "Rubavu District" },
  ],
  trendingTopics: [
    "Precision Agriculture",
    "Climate-Smart Farming",
    "Pest Management",
    "Market Trends",
    "Soil Health",
  ],
  practices: [
    { id: "practice-1", title: "Mulch-assisted moisture conservation", status: "Community Approved", rating: "4.6/5", focus: "Sustainability" },
    { id: "practice-2", title: "Split nitrogen application in maize", status: "Expert Verified", rating: "4.8/5", focus: "Yield Efficiency" },
    { id: "practice-3", title: "Trap-guided fall armyworm scouting", status: "Expert Verified", rating: "4.5/5", focus: "Crop Protection" },
  ],
  resources: [
    { id: "resource-1", title: "Rwanda Maize Production Guide", type: "Extension Guide" },
    { id: "resource-2", title: "Climate Adaptation for Smallholder Irrigation", type: "Training Manual" },
    { id: "resource-3", title: "National Fertilizer Use Recommendations", type: "Government Publication" },
    { id: "resource-4", title: "Potato Disease Surveillance Protocol", type: "Research Paper" },
    { id: "resource-5", title: "Farmer Field Video: Moisture Conservation", type: "Video Tutorial" },
  ],
  contributors: [
    { id: "contrib-1", name: "Rodrigue Farmer", contributions: 16, score: 92, rank: "Regional Champion" },
    { id: "contrib-2", name: "Claudine Uwera", contributions: 13, score: 88, rank: "Knowledge Leader" },
    { id: "contrib-3", name: "Jean Bosco Ndayisaba", contributions: 11, score: 84, rank: "Practice Validator" },
  ],
  activityFeed: [
    { id: "activity-1", title: "New discussion opened on maize nitrogen timing", type: "Discussion", time: "1 hour ago" },
    { id: "activity-2", title: "Expert response posted on dry-season irrigation", type: "Expert Response", time: "3 hours ago" },
    { id: "activity-3", title: "Best practice validated in Rwamagana", type: "Validation", time: "Yesterday" },
    { id: "activity-4", title: "Field demo registration confirmed", type: "Event", time: "Yesterday" },
  ],
  joinedEvents: [],
  submittedPractices: [],
};

function normalizeCommunityState(saved) {
  if (!saved) return initialData;

  return {
    ...initialData,
    ...saved,
    stats: { ...initialData.stats, ...(saved.stats || {}) },
    impactMetrics: { ...initialData.impactMetrics, ...(saved.impactMetrics || {}) },
    discussions: Array.isArray(saved.discussions) ? saved.discussions : initialData.discussions,
    questions: Array.isArray(saved.questions) ? saved.questions : initialData.questions,
    stories: Array.isArray(saved.stories) ? saved.stories : initialData.stories,
    events: Array.isArray(saved.events) ? saved.events : initialData.events,
    experts: Array.isArray(saved.experts) ? saved.experts : initialData.experts,
    trendingTopics: Array.isArray(saved.trendingTopics) ? saved.trendingTopics : initialData.trendingTopics,
    practices: Array.isArray(saved.practices) ? saved.practices : initialData.practices,
    resources: Array.isArray(saved.resources) ? saved.resources : initialData.resources,
    contributors: Array.isArray(saved.contributors) ? saved.contributors : initialData.contributors,
    activityFeed: Array.isArray(saved.activityFeed) ? saved.activityFeed : initialData.activityFeed,
    joinedEvents: Array.isArray(saved.joinedEvents) ? saved.joinedEvents : [],
    submittedPractices: Array.isArray(saved.submittedPractices) ? saved.submittedPractices : [],
  };
}

function loadCommunityState() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMUNITY_STORAGE_KEY) || "null");
    return normalizeCommunityState(saved);
  } catch {
    return initialData;
  }
}

function saveCommunityState(state) {
  localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(state));
}

export function CommunityPage() {
  const { user } = useAuth();
  const [state, setState] = useState(() => loadCommunityState());
  const [communityMode, setCommunityMode] = useState(isBackendSessionActive() ? "backend" : "demo");
  const [isSyncing, setIsSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    crop: "All",
    region: "All",
    topic: "All",
    expert: "All",
    date: "All",
  });
  const [discussionCategory, setDiscussionCategory] = useState("All");
  const [expertQuestion, setExpertQuestion] = useState("");
  const [selectedExpert, setSelectedExpert] = useState("Dr. Alice Uwase");
  const [practiceTitle, setPracticeTitle] = useState("");
  const [practiceBody, setPracticeBody] = useState("");
  const [practiceFocus, setPracticeFocus] = useState("Climate-Smart Farming");
  const [message, setMessage] = useState("");

  const discussionsRef = useRef(null);
  const expertsRef = useRef(null);
  const storiesRef = useRef(null);
  const eventsRef = useRef(null);

  useEffect(() => {
    saveCommunityState(state);
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    async function syncCommunityDashboard() {
      if (!isBackendSessionActive()) return;

      setIsSyncing(true);
      try {
        const dashboard = await phase1BackendService.community.dashboard();
        if (!isMounted || !dashboard) return;
        setState(normalizeCommunityState(dashboard));
        setCommunityMode("backend");
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Community backend sync failed, continuing with demo/local data.", error);
        }
        if (isMounted) {
          setCommunityMode("demo");
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    syncCommunityDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const safeDiscussions = Array.isArray(state.discussions) ? state.discussions : [];
  const safeQuestions = Array.isArray(state.questions) ? state.questions : [];
  const safeStories = Array.isArray(state.stories) ? state.stories : [];
  const safeExperts = Array.isArray(state.experts) ? state.experts : [];
  const safeEvents = Array.isArray(state.events) ? state.events : [];
  const safeTrendingTopics = Array.isArray(state.trendingTopics) ? state.trendingTopics : [];
  const safePractices = Array.isArray(state.practices) ? state.practices : [];
  const safeResources = Array.isArray(state.resources) ? state.resources : [];
  const safeContributors = Array.isArray(state.contributors) ? state.contributors : [];
  const safeActivityFeed = Array.isArray(state.activityFeed) ? state.activityFeed : [];
  const crops = useMemo(() => ["All", ...new Set(safeDiscussions.map((item) => item.crop))], [safeDiscussions]);
  const regions = useMemo(() => ["All", ...new Set(safeDiscussions.map((item) => item.region))], [safeDiscussions]);
  const topics = useMemo(() => ["All", ...new Set(safeDiscussions.map((item) => item.topic))], [safeDiscussions]);
  const experts = useMemo(() => ["All", ...safeExperts.map((item) => item.name)], [safeExperts]);
  const categories = useMemo(() => ["All", ...new Set(safeDiscussions.map((item) => item.category))], [safeDiscussions]);

  const filteredDiscussions = useMemo(() => {
    return safeDiscussions.filter((item) => {
      const haystack = [item.title, item.summary, item.category, item.crop, item.region, item.topic, item.expert]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesCategory = discussionCategory === "All" || item.category === discussionCategory;
      const matchesCrop = filters.crop === "All" || item.crop === filters.crop;
      const matchesRegion = filters.region === "All" || item.region === filters.region;
      const matchesTopic = filters.topic === "All" || item.topic === filters.topic;
      const matchesExpert = filters.expert === "All" || item.expert === filters.expert;
      const matchesDate = filters.date === "All" || item.postedAt === filters.date;
      return (
        matchesQuery &&
        matchesCategory &&
        matchesCrop &&
        matchesRegion &&
        matchesTopic &&
        matchesExpert &&
        matchesDate
      );
    });
  }, [discussionCategory, filters, query, safeDiscussions]);

  const recentQuestions = useMemo(() => safeQuestions.slice(0, 3), [safeQuestions]);
  const featuredStories = useMemo(() => safeStories.slice(0, 3), [safeStories]);
  const topStats = useMemo(
    () => [
      { label: "Total Discussions", value: state.stats.totalDiscussions, icon: MessageSquareMore },
      { label: "Active Experts", value: state.stats.activeExperts, icon: UserRound },
      { label: "Validated Practices", value: state.stats.validatedPractices, icon: ClipboardCheck },
      { label: "Upcoming Events", value: state.stats.upcomingEvents, icon: CalendarDays },
      { label: "Knowledge Articles", value: state.stats.knowledgeArticles, icon: BookOpenText },
    ],
    [state.stats]
  );

  const impactCards = useMemo(
    () => [
      { label: "Practices Adopted", value: state.impactMetrics.practicesAdopted, icon: Sprout },
      { label: "Farmers Reached", value: state.impactMetrics.farmersReached, icon: Users },
      { label: "Questions Resolved", value: state.impactMetrics.questionsResolved, icon: CheckCircle2 },
      { label: "Resources Shared", value: state.impactMetrics.resourcesShared, icon: Landmark },
    ],
    [state.impactMetrics]
  );

  const submitQuestion = async () => {
    const trimmed = expertQuestion.trim();
    if (!trimmed) return;

    if (isBackendSessionActive()) {
      try {
        const result = await phase1BackendService.community.submitQuestion({
          question: trimmed,
          expert: selectedExpert,
        });
        if (result?.dashboard) {
          setState(normalizeCommunityState(result.dashboard));
          setCommunityMode("backend");
          setExpertQuestion("");
          setMessage("Your expert question has been submitted to the advisory queue.");
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Community question backend submit failed, using local fallback.", error);
        }
      }
    }

    setState((current) => ({
      ...current,
      questions: [
        {
          id: `question-${Date.now()}`,
          question: trimmed,
          askedBy: user?.name || "Community Member",
          expert: selectedExpert,
          response: "Pending expert response.",
          status: "Queued",
          accepted: false,
          category: current.experts.find((item) => item.name === selectedExpert)?.specialty || "Agriculture",
          postedAt: "Today",
        },
        ...current.questions,
      ],
      activityFeed: [
        {
          id: `activity-${Date.now()}`,
          title: `New expert question submitted for ${selectedExpert}`,
          type: "Expert Response",
          time: "Just now",
        },
        ...current.activityFeed,
      ],
    }));

    setExpertQuestion("");
    setMessage("Your expert question has been submitted to the advisory queue.");
  };

  const markAccepted = async (questionId) => {
    if (isBackendSessionActive()) {
      try {
        const result = await phase1BackendService.community.acceptQuestion(questionId);
        if (result?.dashboard) {
          setState(normalizeCommunityState(result.dashboard));
          setCommunityMode("backend");
          setMessage("Expert answer marked as accepted.");
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Community question acceptance failed, using local fallback.", error);
        }
      }
    }

    setState((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === questionId ? { ...item, accepted: true, status: "Accepted" } : item
      ),
    }));
    setMessage("Expert answer marked as accepted.");
  };

  const registerEvent = async (eventId) => {
    if (isBackendSessionActive()) {
      try {
        const result = await phase1BackendService.community.registerEvent(eventId);
        if (result?.dashboard) {
          setState(normalizeCommunityState(result.dashboard));
          setCommunityMode("backend");
          const target = result.dashboard.events?.find((item) => item.id === eventId);
          setMessage(target ? `Registered for ${target.title}.` : "Event registration recorded.");
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Community event registration failed, using local fallback.", error);
        }
      }
    }

    setState((current) => ({
      ...current,
      joinedEvents: current.joinedEvents.includes(eventId) ? current.joinedEvents : [...current.joinedEvents, eventId],
      activityFeed: current.activityFeed,
    }));
    const target = safeEvents.find((item) => item.id === eventId);
    setMessage(target ? `Registered for ${target.title}.` : "Event registration recorded.");
  };

  const submitPractice = async () => {
    const title = practiceTitle.trim();
    const body = practiceBody.trim();
    if (!title || !body) return;

    if (isBackendSessionActive()) {
      try {
        const result = await phase1BackendService.community.submitPractice({
          title,
          body,
          focus: practiceFocus,
        });
        if (result?.dashboard) {
          setState(normalizeCommunityState(result.dashboard));
          setCommunityMode("backend");
          setPracticeTitle("");
          setPracticeBody("");
          setPracticeFocus("Climate-Smart Farming");
          setMessage("Practice submitted for community and expert validation.");
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Community practice submission failed, using local fallback.", error);
        }
      }
    }

    setState((current) => ({
      ...current,
      submittedPractices: [
        {
          id: `submitted-practice-${Date.now()}`,
          title,
          body,
          focus: practiceFocus,
          status: "Pending validation",
        },
        ...current.submittedPractices,
      ],
      activityFeed: [
        {
          id: `activity-practice-${Date.now()}`,
          title: `New practice submitted: ${title}`,
          type: "Validation",
          time: "Just now",
        },
        ...current.activityFeed,
      ],
    }));

    setPracticeTitle("");
    setPracticeBody("");
    setPracticeFocus("Climate-Smart Farming");
    setMessage("Practice submitted for community and expert validation.");
  };

  const contactExpert = (name) => {
    setSelectedExpert(name);
    expertsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMessage(`${name} selected for expert consultation.`);
  };

  const openCaseStudy = (story) => {
    setMessage(`${story.title} opened for deeper review.`);
    storiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="management-page prototype-community-page functional-community-page knowledge-hub-page">
      <div className="page-title-block prototype-community-title">
        <h1>Community &amp; Knowledge Sharing</h1>
        <p>
          National agricultural knowledge hub connecting farmers, experts, researchers, and extension officers through validated discussions, evidence-based learning, and practical field insights.
        </p>
      </div>

      <div className="regional-source-row">
        <span className="regional-source-badge local">{communityMode === "backend" ? "Backend Community Data" : "Local Data"}</span>
        <span className="regional-source-badge demo">{communityMode === "backend" ? "Demo + Persistent Knowledge Data" : "Demo Knowledge Data"}</span>
        {DEMO_MODE ? <span className="regional-source-badge">DEMO_MODE</span> : null}
        {isSyncing ? <span className="regional-source-badge">Syncing...</span> : null}
      </div>

      {message ? (
        <div className="community-inline-notice" role="status">
          {message}
        </div>
      ) : null}

      <div className="knowledge-hub-layout">
        <div className="knowledge-hub-main">
          <section className="knowledge-hub-stats-grid">
            {topStats.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="prototype-panel knowledge-hub-stat-card">
                  <div className="knowledge-hub-stat-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              );
            })}
          </section>

          <article className="prototype-panel knowledge-hub-impact-card">
            <div className="knowledge-hub-section-head">
              <h2>
                <TrendingUp size={18} />
                <span>Community Impact Metrics</span>
              </h2>
            </div>
            <div className="knowledge-hub-impact-grid">
              {impactCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="knowledge-hub-impact-item">
                    <div className="knowledge-hub-impact-icon">
                      <Icon size={16} />
                    </div>
                    <strong>{item.value.toLocaleString()}</strong>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="prototype-panel knowledge-hub-discussions" ref={discussionsRef}>
            <div className="knowledge-hub-section-head">
              <h2>
                <MessageSquareMore size={18} />
                <span>Farmer Discussion Board</span>
              </h2>
            </div>

            <div className="knowledge-hub-filter-strip">
              <label className="prototype-inline-search compact wide">
                <Search size={16} />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search discussions, field innovations, expert notes..."
                />
              </label>

              <div className="knowledge-hub-chip-row">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={discussionCategory === category ? "community-filter-chip active" : "community-filter-chip"}
                    onClick={() => setDiscussionCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="knowledge-hub-advanced-filters">
              <div className="knowledge-hub-advanced-title">
                <Filter size={15} />
                <span>Search &amp; Filter System</span>
              </div>
              <div className="knowledge-hub-filter-grid">
                <label className="community-field">
                  <span>Crop</span>
                  <select value={filters.crop} onChange={(event) => setFilters((current) => ({ ...current, crop: event.target.value }))}>
                    {crops.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Region</span>
                  <select value={filters.region} onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value }))}>
                    {regions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Topic</span>
                  <select value={filters.topic} onChange={(event) => setFilters((current) => ({ ...current, topic: event.target.value }))}>
                    {topics.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Expert</span>
                  <select value={filters.expert} onChange={(event) => setFilters((current) => ({ ...current, expert: event.target.value }))}>
                    {experts.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Date</span>
                  <select value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}>
                    {["All", "Today", "Yesterday", "Earlier"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="knowledge-hub-discussion-list">
              {filteredDiscussions.length ? filteredDiscussions.map((item) => (
                <article key={item.id} className="knowledge-hub-discussion-card">
                  <div className="knowledge-hub-discussion-head">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                    </div>
                    <span className={`knowledge-hub-validation-pill ${item.validationStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                      {item.validationStatus}
                    </span>
                  </div>

                  <div className="knowledge-hub-tag-row">
                    <span>{item.category}</span>
                    <span>{item.crop}</span>
                    <span>{item.region}</span>
                    <span>{item.topic}</span>
                  </div>

                  <div className="knowledge-hub-discussion-meta">
                    <span><MessageSquareMore size={14} /> {item.replies} replies</span>
                    <span><Eye size={14} /> {item.views} views</span>
                    <span><Star size={14} /> {item.likes} likes</span>
                    <span><UserRound size={14} /> {item.expert}</span>
                    <span><Clock3 size={14} /> {item.lastActivity}</span>
                  </div>
                </article>
              )) : (
                <div className="prototype-empty-state-card">
                  <strong>No discussions match the current filters.</strong>
                  <p>Try a different crop, region, topic, or expert filter. Demo content will remain available even without backend APIs.</p>
                </div>
              )}
            </div>
          </article>

          <div className="knowledge-hub-split-grid">
            <article className="prototype-panel knowledge-hub-qa-card" ref={expertsRef}>
              <div className="knowledge-hub-section-head">
                <h2>
                  <CircleHelp size={18} />
                  <span>Expert Q&amp;A Center</span>
                </h2>
              </div>

              <div className="community-expert-form">
                <label className="community-field">
                  <span>Select Expert</span>
                  <select value={selectedExpert} onChange={(event) => setSelectedExpert(event.target.value)}>
                    {safeExperts.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name} - {item.specialty}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  rows="4"
                  value={expertQuestion}
                  onChange={(event) => setExpertQuestion(event.target.value)}
                  placeholder="Ask a realistic farming question about nutrient timing, disease management, irrigation, or market planning..."
                />
                <div className="knowledge-hub-inline-actions">
                  <button type="button" className="prototype-community-green-button" onClick={submitQuestion}>
                    <Send size={15} />
                    <span>Ask an Expert</span>
                  </button>
                </div>
              </div>

              <div className="community-inline-list">
                {recentQuestions.map((item) => (
                  <div key={item.id} className="community-inline-item">
                    <strong>{item.question}</strong>
                    <span>{item.status} · {item.expert}</span>
                    <p>{item.response}</p>
                    <div className="knowledge-hub-inline-actions">
                      <button
                        type="button"
                        className="community-action-button soft"
                        onClick={() => markAccepted(item.id)}
                      >
                        <CheckCircle2 size={15} />
                        <span>{item.accepted ? "Accepted Answer" : "Mark Accepted Answer"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel knowledge-hub-stories-card" ref={storiesRef}>
              <div className="knowledge-hub-section-head">
                <h2>
                  <Leaf size={18} />
                  <span>Success Stories &amp; Case Studies</span>
                </h2>
              </div>
              <div className="knowledge-hub-story-list">
                {featuredStories.map((story) => (
                  <div key={story.id} className="knowledge-hub-story-item">
                    <div className="knowledge-hub-story-badge">{story.theme}</div>
                    <strong>{story.title}</strong>
                    <p>{story.summary}</p>
                    <small>{story.beforeAfter} · {story.district}</small>
                    <button type="button" className="prototype-community-read-link" onClick={() => openCaseStudy(story)}>
                      Read full case study
                    </button>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="knowledge-hub-split-grid">
            <article className="prototype-panel knowledge-hub-contributors-card">
              <div className="knowledge-hub-section-head">
                <h2>
                  <Users size={18} />
                  <span>Top Contributors</span>
                </h2>
              </div>
              <div className="knowledge-hub-table-list">
                {safeContributors.map((item) => (
                  <div key={item.id} className="knowledge-hub-table-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.rank}</span>
                    </div>
                    <span>{item.contributions} contributions</span>
                    <span>{item.score}% validation score</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel knowledge-hub-practice-card">
              <div className="knowledge-hub-section-head">
                <h2>
                  <ShieldCheck size={18} />
                  <span>Submit Local Best Practice</span>
                </h2>
              </div>
              <div className="community-submission-grid">
                <label className="community-field">
                  <span>Practice title</span>
                  <input
                    type="text"
                    value={practiceTitle}
                    onChange={(event) => setPracticeTitle(event.target.value)}
                    placeholder="e.g. Moisture-saving mulching for maize"
                  />
                </label>
                <label className="community-field">
                  <span>Focus area</span>
                  <select value={practiceFocus} onChange={(event) => setPracticeFocus(event.target.value)}>
                    <option>Climate-Smart Farming</option>
                    <option>Soil Health</option>
                    <option>Crop Protection</option>
                    <option>Market Access</option>
                  </select>
                </label>
                <label className="community-field full">
                  <span>Evidence / field observation</span>
                  <textarea
                    rows="4"
                    value={practiceBody}
                    onChange={(event) => setPracticeBody(event.target.value)}
                    placeholder="Describe the practice, where it was used, and what measurable results were observed."
                  />
                </label>
              </div>
              <div className="community-submission-actions">
                <button type="button" className="prototype-community-green-button" onClick={submitPractice}>
                  <Send size={15} />
                  <span>Submit for Validation</span>
                </button>
              </div>
              {state.submittedPractices.length ? (
                <div className="community-submission-list">
                  {state.submittedPractices.slice(0, 2).map((item) => (
                    <div key={item.id} className="community-submission-item">
                      <strong>{item.title}</strong>
                      <span>{item.focus} · {item.status}</span>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          </div>
        </div>

        <aside className="knowledge-hub-side">
          <article className="prototype-panel knowledge-hub-side-card" ref={eventsRef}>
            <div className="knowledge-hub-section-head">
              <h2>
                <CalendarDays size={18} />
                <span>Training &amp; Events Calendar</span>
              </h2>
            </div>
            <div className="knowledge-hub-side-list">
              {safeEvents.map((event) => (
                <div key={event.id} className="knowledge-hub-event-item">
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.type} · {event.date}</span>
                    <small><MapPin size={13} /> {event.venue}, {event.region}</small>
                  </div>
                  <button type="button" className="community-event-join" onClick={() => registerEvent(event.id)}>
                    {state.joinedEvents.includes(event.id) ? "Registered" : "Register"}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel knowledge-hub-side-card">
            <div className="knowledge-hub-section-head">
              <h2>
                <GraduationCap size={18} />
                <span>Expert Directory</span>
              </h2>
            </div>
            <div className="knowledge-hub-side-list">
              {safeExperts.map((item) => (
                <div key={item.id} className="knowledge-hub-expert-item">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.specialty}</span>
                    <small>{item.organization} · {item.district}</small>
                  </div>
                  <button type="button" className="prototype-community-outline-button" onClick={() => contactExpert(item.name)}>
                    Contact Expert
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel knowledge-hub-side-card">
            <div className="knowledge-hub-section-head">
              <h2>
                <Waves size={18} />
                <span>Trending Topics</span>
              </h2>
            </div>
            <div className="knowledge-hub-topic-list">
              {safeTrendingTopics.map((item) => (
                <span key={item} className="knowledge-hub-topic-chip">{item}</span>
              ))}
            </div>
          </article>

          <article className="prototype-panel knowledge-hub-side-card">
            <div className="knowledge-hub-section-head">
              <h2>
                <ShieldCheck size={18} />
                <span>Validated Best Practices</span>
              </h2>
            </div>
            <div className="knowledge-hub-side-list">
              {safePractices.map((item) => (
                <div key={item.id} className="knowledge-hub-practice-item">
                  <strong>{item.title}</strong>
                  <span>{item.status}</span>
                  <small>{item.focus} · Sustainability rating {item.rating}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel knowledge-hub-side-card">
            <div className="knowledge-hub-section-head">
              <h2>
                <BookOpenText size={18} />
                <span>Knowledge Resources</span>
              </h2>
            </div>
            <div className="knowledge-hub-side-list">
              {safeResources.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="knowledge-hub-resource-link"
                  onClick={() => setMessage(`${item.title} will open from the connected knowledge repository in the next backend phase.`)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.type}</span>
                  </div>
                  <BookOpenText size={15} />
                </button>
              ))}
            </div>
          </article>

          <article className="prototype-panel knowledge-hub-side-card">
            <div className="knowledge-hub-section-head">
              <h2>
                <Rss size={18} />
                <span>Community Activity Feed</span>
              </h2>
            </div>
            <div className="knowledge-hub-side-list">
              {safeActivityFeed.map((item) => (
                <div key={item.id} className="knowledge-hub-activity-item">
                  <strong>{item.title}</strong>
                  <span>{item.type}</span>
                  <small>{item.time}</small>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
