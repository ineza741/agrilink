import {
  BadgeCheck,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Eye,
  Filter,
  GraduationCap,
  Heart,
  Landmark,
  Leaf,
  MapPin,
  MessageSquareMore,
  Plus,
  Rss,
  Search,
  Send,
  ShieldCheck,
  Sprout,
  TrendingUp,
  UserRound,
  Users,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FilterChip } from "../../components/common/FilterBar";

const COMMUNITY_STORAGE_KEY = "agri-feed-community-module-v2";

const initialData = {
  stats: { totalDiscussions: 186, activeExperts: 24, validatedPractices: 41, upcomingEvents: 8, knowledgeArticles: 62 },
  impactMetrics: { practicesAdopted: 1280, farmersReached: 6420, questionsResolved: 312, resourcesShared: 214 },
  discussions: [
    { id: "discussion-1", title: "Optimizing Nitrogen Application in Maize for Gatenga Sector", summary: "Farmers are comparing split nitrogen application timing under moderate rainfall variability and looking for the best vegetative-stage strategy.", category: "Soil Management", crop: "Maize", region: "Gatenga Sector, Kicukiro District", topic: "Precision Fertilizer", expert: "Dr. Alice Uwase", replies: 18, views: 246, likes: 38, validationStatus: "Expert Validated", postedAt: "Today", lastActivity: "2 hours ago" },
    { id: "discussion-2", title: "Managing Fall Armyworm in Eastern Province", summary: "Community reports from Bugesera and Rwamagana are comparing scouting intervals, pheromone trap placement, and safe response thresholds.", category: "Crop Protection", crop: "Maize", region: "Nyamata Sector, Bugesera District", topic: "Pest Management", expert: "Jean Claude Habimana", replies: 26, views: 411, likes: 52, validationStatus: "Community Validated", postedAt: "Yesterday", lastActivity: "6 hours ago" },
    { id: "discussion-3", title: "Climate-Smart Irrigation Scheduling in Bugesera", summary: "Producers are comparing water-saving irrigation windows for vegetables under dry spells using short-term forecast trends.", category: "Climate Adaptation", crop: "Vegetables", region: "Nyamata Sector, Bugesera District", topic: "Climate-Smart Farming", expert: "Ing. Patrick Nshuti", replies: 14, views: 198, likes: 29, validationStatus: "Under Review", postedAt: "Earlier", lastActivity: "1 day ago" },
    { id: "discussion-4", title: "Potato Late Blight Monitoring in Musanze District", summary: "Farmers and extension teams are aligning disease scouting frequency with humid weather windows to reduce treatment waste.", category: "Crop Protection", crop: "Potato", region: "Musanze District", topic: "Disease Forecasting", expert: "Dr. Clementine Mukamana", replies: 21, views: 305, likes: 47, validationStatus: "Expert Validated", postedAt: "Earlier", lastActivity: "2 days ago" },
  ],
  questions: [
    { id: "question-1", question: "What is the best way to time top-dressing in maize when rainfall is expected to be low for the next week?", askedBy: "Rodrigue Farmer", expert: "Dr. Alice Uwase", response: "Apply only the first split now and hold the second split until the first effective rainfall event or irrigation support is confirmed.", status: "Answered", accepted: true, category: "Soil Management", postedAt: "Today" },
    { id: "question-2", question: "How can I reduce water use in dry-season vegetable production without losing market quality?", askedBy: "Claudine Uwera", expert: "Ing. Patrick Nshuti", response: "Shift irrigation to early morning, reduce unnecessary leaf wetting, and use mulch to stabilize the root zone.", status: "Answered", accepted: false, category: "Climate Adaptation", postedAt: "Yesterday" },
  ],
  stories: [
    { id: "story-1", title: "Increased maize yield by 35% using precision fertilizer recommendations", summary: "A cooperative cluster in Rwamagana improved nutrient timing and used advisory-based split nitrogen application.", beforeAfter: "Yield improved from 4.2 t/ha to 5.7 t/ha", theme: "Innovation Showcase", climateSmart: true, district: "Rwamagana District" },
    { id: "story-2", title: "Reduced water use by 28% through smart irrigation scheduling", summary: "Vegetable growers in Bugesera used forecast-linked irrigation windows to reduce pumping costs and preserve soil moisture.", beforeAfter: "Water use dropped from 5.4 mm/day to 3.9 mm/day", theme: "Climate-Smart Agriculture", climateSmart: true, district: "Bugesera District" },
    { id: "story-3", title: "Improved potato disease management using AI alerts", summary: "Farmer groups in Musanze aligned fungicide timing with alert thresholds and reduced unnecessary sprays.", beforeAfter: "Blight-related loss reduced by 19%", theme: "Extension-Led Case Study", climateSmart: false, district: "Musanze District" },
  ],
  events: [
    { id: "event-1", title: "Maize Nutrient Management Workshop", type: "Workshop", date: "20 Jun 2026", venue: "Kicukiro Youth Center", region: "Kigali City", registrations: 46, seatsLeft: 14 },
    { id: "event-2", title: "Climate-Smart Farming Webinar", type: "Webinar", date: "24 Jun 2026", venue: "Online", region: "National", registrations: 128, seatsLeft: 72 },
    { id: "event-3", title: "Field Demonstration: Smart Irrigation in Bugesera", type: "Field Demo", date: "28 Jun 2026", venue: "Nyamata Demonstration Site", region: "Bugesera District", registrations: 31, seatsLeft: 19 },
  ],
  experts: [
    { id: "expert-1", name: "Dr. Alice Uwase", specialty: "Soil Management", organization: "RAB Extension Support", district: "Kigali City" },
    { id: "expert-2", name: "Jean Claude Habimana", specialty: "Crop Protection", organization: "Eastern Province Plant Health Unit", district: "Bugesera District" },
    { id: "expert-3", name: "Ing. Patrick Nshuti", specialty: "Climate Adaptation", organization: "Irrigation Innovation Lab", district: "Huye District" },
    { id: "expert-4", name: "Dr. Clementine Mukamana", specialty: "Plant Pathology", organization: "Northern Highlands Research Team", district: "Musanze District" },
    { id: "expert-5", name: "Vestine Mukeshimana", specialty: "Agribusiness", organization: "Market Intelligence Desk", district: "Rubavu District" },
  ],
  trendingTopics: ["Precision Agriculture", "Climate-Smart Farming", "Pest Management", "Market Trends", "Soil Health"],
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
  return { ...initialData, ...saved, stats: { ...initialData.stats, ...(saved.stats || {}) }, impactMetrics: { ...initialData.impactMetrics, ...(saved.impactMetrics || {}) }, discussions: Array.isArray(saved.discussions) ? saved.discussions : initialData.discussions, questions: Array.isArray(saved.questions) ? saved.questions : initialData.questions, stories: Array.isArray(saved.stories) ? saved.stories : initialData.stories, events: Array.isArray(saved.events) ? saved.events : initialData.events, experts: Array.isArray(saved.experts) ? saved.experts : initialData.experts, trendingTopics: Array.isArray(saved.trendingTopics) ? saved.trendingTopics : initialData.trendingTopics, practices: Array.isArray(saved.practices) ? saved.practices : initialData.practices, resources: Array.isArray(saved.resources) ? saved.resources : initialData.resources, contributors: Array.isArray(saved.contributors) ? saved.contributors : initialData.contributors, activityFeed: Array.isArray(saved.activityFeed) ? saved.activityFeed : initialData.activityFeed, joinedEvents: Array.isArray(saved.joinedEvents) ? saved.joinedEvents : [], submittedPractices: Array.isArray(saved.submittedPractices) ? saved.submittedPractices : [] };
}

function loadCommunityState() { try { const saved = JSON.parse(localStorage.getItem(COMMUNITY_STORAGE_KEY) || "null"); return normalizeCommunityState(saved); } catch { return initialData; } }
function saveCommunityState(state) { localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(state)); }

export function CommunityPage() {
  const { user } = useAuth();
  const [state, setState] = useState(() => loadCommunityState());
  const [communityMode, setCommunityMode] = useState(isBackendSessionActive() ? "backend" : "demo");
  const [isSyncing, setIsSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ crop: "All", region: "All", topic: "All", expert: "All", date: "All" });
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

  useEffect(() => { saveCommunityState(state); }, [state]);

  useEffect(() => {
    let isMounted = true;
    let safetyTimeoutId;
    async function syncCommunityDashboard() {
      if (!isBackendSessionActive()) return;
      setIsSyncing(true);
      safetyTimeoutId = setTimeout(() => { if (isMounted) setIsSyncing(false); }, 5000);
      try { const dashboard = await phase1BackendService.community.dashboard(); if (!isMounted || !dashboard) return; clearTimeout(safetyTimeoutId); setState(normalizeCommunityState(dashboard)); setCommunityMode("backend"); } catch (error) { clearTimeout(safetyTimeoutId); if (import.meta.env.DEV) console.warn("Community backend sync failed", error); if (isMounted) setCommunityMode("demo"); } finally { if (isMounted) setIsSyncing(false); }
    }
    syncCommunityDashboard(); return () => { isMounted = false; clearTimeout(safetyTimeoutId); };
  }, []);

  useEffect(() => { if (!message) return; const timeoutId = window.setTimeout(() => setMessage(""), 3200); return () => window.clearTimeout(timeoutId); }, [message]);

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
      const haystack = [item.title, item.summary, item.category, item.crop, item.region, item.topic, item.expert].join(" ").toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesCategory = discussionCategory === "All" || item.category === discussionCategory;
      const matchesCrop = filters.crop === "All" || item.crop === filters.crop;
      const matchesRegion = filters.region === "All" || item.region === filters.region;
      const matchesTopic = filters.topic === "All" || item.topic === filters.topic;
      const matchesExpert = filters.expert === "All" || item.expert === filters.expert;
      const matchesDate = filters.date === "All" || item.postedAt === filters.date;
      return matchesQuery && matchesCategory && matchesCrop && matchesRegion && matchesTopic && matchesExpert && matchesDate;
    });
  }, [discussionCategory, filters, query, safeDiscussions]);

  const recentQuestions = useMemo(() => safeQuestions.slice(0, 3), [safeQuestions]);
  const featuredStories = useMemo(() => safeStories.slice(0, 3), [safeStories]);
  const topStats = useMemo(() => [
    { label: "Total Discussions", value: state.stats.totalDiscussions, icon: MessageSquareMore },
    { label: "Active Experts", value: state.stats.activeExperts, icon: UserRound },
    { label: "Validated Practices", value: state.stats.validatedPractices, icon: ClipboardCheck },
    { label: "Upcoming Events", value: state.stats.upcomingEvents, icon: CalendarDays },
    { label: "Knowledge Articles", value: state.stats.knowledgeArticles, icon: BookOpenText },
  ], [state.stats]);
  const impactCards = useMemo(() => [
    { label: "Practices Adopted", value: state.impactMetrics.practicesAdopted, icon: Sprout },
    { label: "Farmers Reached", value: state.impactMetrics.farmersReached, icon: Users },
    { label: "Questions Resolved", value: state.impactMetrics.questionsResolved, icon: CheckCircle2 },
    { label: "Resources Shared", value: state.impactMetrics.resourcesShared, icon: Landmark },
  ], [state.impactMetrics]);

  const submitQuestion = async () => {
    const trimmed = expertQuestion.trim();
    if (!trimmed) return;
    setState((current) => ({
      ...current, questions: [{ id: `question-${Date.now()}`, question: trimmed, askedBy: user?.name || "Community Member", expert: selectedExpert, response: "Pending expert response.", status: "Queued", accepted: false, category: current.experts.find((item) => item.name === selectedExpert)?.specialty || "Agriculture", postedAt: "Today" }, ...current.questions],
      activityFeed: [{ id: `activity-${Date.now()}`, title: `New expert question submitted for ${selectedExpert}`, type: "Expert Response", time: "Just now" }, ...current.activityFeed],
    }));
    setExpertQuestion(""); setMessage("Your expert question has been submitted to the advisory queue.");
  };

  const markAccepted = async (questionId) => {
    setState((current) => ({ ...current, questions: current.questions.map((item) => item.id === questionId ? { ...item, accepted: true, status: "Accepted" } : item) }));
    setMessage("Expert answer marked as accepted.");
  };

  const registerEvent = async (eventId) => {
    setState((current) => ({ ...current, joinedEvents: current.joinedEvents.includes(eventId) ? current.joinedEvents : [...current.joinedEvents, eventId] }));
    const target = safeEvents.find((item) => item.id === eventId);
    setMessage(target ? `Registered for ${target.title}.` : "Event registration recorded.");
  };

  const submitPractice = async () => {
    const title = practiceTitle.trim();
    const body = practiceBody.trim();
    if (!title || !body) return;
    setState((current) => ({
      ...current, submittedPractices: [{ id: `submitted-practice-${Date.now()}`, title, body, focus: practiceFocus, status: "Pending validation" }, ...current.submittedPractices],
      activityFeed: [{ id: `activity-practice-${Date.now()}`, title: `New practice submitted: ${title}`, type: "Validation", time: "Just now" }, ...current.activityFeed],
    }));
    setPracticeTitle(""); setPracticeBody(""); setPracticeFocus("Climate-Smart Farming"); setMessage("Practice submitted for community and expert validation.");
  };

  const activityIcons = { Discussion: MessageSquareMore, "Expert Response": GraduationCap, Validation: ShieldCheck, Event: CalendarDays };
  const kpiTrends = { "Total Discussions": "+12% this month", "Active Experts": "+3 this week", "Validated Practices": "+8 this month", "Upcoming Events": "Next: Jun 20", "Knowledge Articles": "+5 this month" };

  return (
    <PageShell>
      <PageHeader
        title="Community &amp; Knowledge Sharing"
        subtitle="Connect farmers, experts, researchers, and extension officers through validated agricultural knowledge."
        actions={
          <div className="comm-header-actions">
            <StatusBadge variant={communityMode === "backend" ? "success" : "default"}>
              {communityMode === "backend" ? "Backend" : "Local"}
            </StatusBadge>
            {isSyncing ? <StatusBadge variant="info">Syncing...</StatusBadge> : null}
          </div>
        }
      />

      {message ? <div className="comm-toast">{message}</div> : null}

      {/* Toolbar */}
      <div className="comm-toolbar">
        <div className="comm-search-wrap">
          <Search size={16} />
          <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search discussions, innovations, expert notes..." />
        </div>
        <div className="comm-quick-actions">
          <ActionButton variant="primary" size="sm" onClick={() => document.getElementById("expert-qa-section")?.scrollIntoView({ behavior: "smooth" })}>
            <CircleHelp size={14} /> <span>Ask Expert</span>
          </ActionButton>
          <ActionButton variant="secondary" size="sm" onClick={() => document.getElementById("submit-practice-section")?.scrollIntoView({ behavior: "smooth" })}>
            <Plus size={14} /> <span>Submit Best Practice</span>
          </ActionButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="comm-kpi-grid">
        {topStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="comm-kpi-card">
              <div className="comm-kpi-icon"><Icon size={20} /></div>
              <div className="comm-kpi-value">{item.value}</div>
              <div className="comm-kpi-label">{item.label}</div>
              <div className="comm-kpi-trend">{kpiTrends[item.label] || ""}</div>
            </div>
          );
        })}
      </div>

      {/* Community Impact */}
      <AppCard>
        <div className="comm-section-header">
          <TrendingUp size={18} />
          <h3>Community Impact</h3>
          <span className="comm-section-sub">Measurable outcomes across the network</span>
        </div>
        <div className="comm-impact-grid">
          {impactCards.map((item) => {
            const Icon = item.icon;
            const barPct = Math.min(100, Math.round((item.value / 7000) * 100));
            return (
              <div key={item.label} className="comm-impact-card">
                <div className="comm-impact-icon"><Icon size={18} /></div>
                <div className="comm-impact-value">{item.value.toLocaleString()}</div>
                <div className="comm-impact-label">{item.label}</div>
                <div className="comm-impact-bar"><div className="comm-impact-fill" style={{ width: `${barPct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </AppCard>

      {/* Main layout */}
      <div className="comm-main-layout">
        <div className="comm-main-left">

          {/* Farmer Discussion Board */}
          <AppCard>
            <div className="comm-section-header">
              <MessageSquareMore size={18} />
              <h3>Farmer Discussion Board</h3>
            </div>

            <div className="comm-category-strip">
              {categories.map((category) => (
                <FilterChip key={category} active={discussionCategory === category} onClick={() => setDiscussionCategory(category)}>
                  {category}
                </FilterChip>
              ))}
            </div>

            <details className="comm-filters-details">
              <summary><Filter size={14} /> Advanced Filters</summary>
              <div className="comm-filters-grid">
                {[{ key: "crop", options: crops, label: "Crop" }, { key: "region", options: regions, label: "Region" }, { key: "topic", options: topics, label: "Topic" }, { key: "expert", options: experts, label: "Expert" }, { key: "date", options: ["All", "Today", "Yesterday", "Earlier"], label: "Date" }].map((field) => (
                  <label key={field.key} className="comm-filter-field">
                    <span>{field.label}</span>
                    <select value={filters[field.key]} onChange={(event) => setFilters((current) => ({ ...current, [field.key]: event.target.value }))}>
                      {field.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </label>
                ))}
              </div>
            </details>

            <div className="comm-disc-list">
              {filteredDiscussions.length ? filteredDiscussions.map((item) => {
                const initials = (item.expert || "").split(" ").map((w) => w[0]).join("").slice(0, 2);
                return (
                  <div key={item.id} className="comm-disc-card">
                    <div className="comm-disc-avatar">{initials}</div>
                    <div className="comm-disc-body">
                      <div className="comm-disc-title-row">
                        <h4>{item.title}</h4>
                        <StatusBadge variant={item.validationStatus === "Expert Validated" ? "success" : item.validationStatus === "Community Validated" ? "info" : "warning"}>
                          {item.validationStatus}
                        </StatusBadge>
                      </div>
                      <p>{item.summary}</p>
                      <div className="comm-disc-tags">
                        <span className="comm-tag comm-tag-cat">{item.category}</span>
                        <span className="comm-tag comm-tag-crop"><Leaf size={11} /> {item.crop}</span>
                        <span className="comm-tag comm-tag-region"><MapPin size={11} /> {item.region}</span>
                        <span className="comm-tag comm-tag-topic">{item.topic}</span>
                      </div>
                      <div className="comm-disc-footer">
                        <span><MessageSquareMore size={13} /> {item.replies} replies</span>
                        <span><Eye size={13} /> {item.views}</span>
                        <span><Heart size={13} /> {item.likes}</span>
                        <span><Clock3 size={13} /> {item.lastActivity}</span>
                      </div>
                      <ActionButton size="sm" variant="ghost"><Eye size={13} /> View Discussion</ActionButton>
                    </div>
                  </div>
                );
              }) : (
                <div className="comm-empty">
                  <strong>No discussions match the current filters.</strong>
                  <p>Try a different crop, region, topic, or expert filter.</p>
                </div>
              )}
            </div>
          </AppCard>

          {/* Expert Q&A + Success Stories */}
          <div className="comm-two-col">
            <AppCard id="expert-qa-section">
              <div className="comm-section-header">
                <GraduationCap size={18} />
                <h3>Expert Q&amp;A</h3>
              </div>
              <div className="comm-expert-preview">
                <div className="comm-expert-preview-avatar">
                  {(selectedExpert || "").split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="comm-expert-preview-info">
                  <strong>{selectedExpert}</strong>
                  <span>{safeExperts.find((e) => e.name === selectedExpert)?.specialty || "Agriculture"}</span>
                  <span className="comm-expert-preview-org">{safeExperts.find((e) => e.name === selectedExpert)?.organization || ""}</span>
                </div>
                <StatusBadge variant="success">Available</StatusBadge>
              </div>
              <div className="comm-qa-input">
                <select value={selectedExpert} onChange={(event) => setSelectedExpert(event.target.value)} className="comm-qa-select">
                  {safeExperts.map((item) => (
                    <option key={item.id} value={item.name}>{item.name} &mdash; {item.specialty}</option>
                  ))}
                </select>
                <textarea rows={3} value={expertQuestion} onChange={(event) => setExpertQuestion(event.target.value)} placeholder="Ask about nutrient timing, disease management, irrigation, or market planning..." />
                <ActionButton variant="primary" onClick={submitQuestion}>
                  <Send size={14} /> <span>Ask an Expert</span>
                </ActionButton>
              </div>
              <div className="comm-answers-list">
                {recentQuestions.map((item) => (
                  <div key={item.id} className="comm-answer-card">
                    <div className="comm-answer-head">
                      <strong>{item.question}</strong>
                      {item.accepted ? <StatusBadge variant="success"><BadgeCheck size={12} /> Accepted</StatusBadge> : null}
                    </div>
                    <span className="comm-answer-meta">{item.expert} &middot; {item.status}</span>
                    <p>{item.response}</p>
                    {!item.accepted ? (
                      <ActionButton size="sm" variant="ghost" onClick={() => markAccepted(item.id)}>
                        <CheckCircle2 size={13} /> Mark Accepted
                      </ActionButton>
                    ) : null}
                  </div>
                ))}
              </div>
            </AppCard>

            <AppCard>
              <div className="comm-section-header">
                <Leaf size={18} />
                <h3>Success Stories</h3>
              </div>
              <div className="comm-stories-grid">
                {featuredStories.map((story) => {
                  const storyImages = { "story-1": "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80", "story-2": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80", "story-3": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" };
                  return (
                    <div key={story.id} className="comm-story-card">
                      <div className="comm-story-image-wrap">
                        <div className="comm-story-img-bg" style={{ background: `linear-gradient(135deg, #0F4C24, #2E7D32)` }} />
                        <div className="comm-story-badge">{story.theme}</div>
                      </div>
                      <div className="comm-story-body">
                        <h4>{story.title}</h4>
                        <p>{story.summary}</p>
                        <div className="comm-story-meta">
                          <span><MapPin size={12} /> {story.district}</span>
                          <span className="comm-story-impact">{story.beforeAfter}</span>
                        </div>
                        <ActionButton size="sm" variant="ghost">Read Case Study</ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AppCard>
          </div>

          {/* Submit Best Practice */}
          <AppCard id="submit-practice-section">
            <div className="comm-section-header">
              <ShieldCheck size={18} />
              <h3>Submit Best Practice</h3>
            </div>
            <div className="comm-practice-form">
              <div className="comm-form-row">
                <label>Title</label>
                <input type="text" value={practiceTitle} onChange={(event) => setPracticeTitle(event.target.value)} placeholder="e.g. Moisture-saving mulching for maize" />
              </div>
              <div className="comm-form-row">
                <label>Focus Area</label>
                <select value={practiceFocus} onChange={(event) => setPracticeFocus(event.target.value)}>
                  <option>Climate-Smart Farming</option>
                  <option>Soil Health</option>
                  <option>Crop Protection</option>
                  <option>Market Access</option>
                </select>
              </div>
              <div className="comm-form-row">
                <label>Evidence / Observation</label>
                <textarea rows={4} value={practiceBody} onChange={(event) => setPracticeBody(event.target.value)} placeholder="Describe the practice, where it was used, and measurable results." />
              </div>
              <div className="comm-form-row">
                <label>Image (optional)</label>
                <div className="comm-upload-area">
                  <div className="comm-upload-placeholder">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                    <span>Drop an image or click to browse</span>
                  </div>
                </div>
              </div>
              <div className="comm-form-row">
                <label>Expected Impact</label>
                <input type="text" placeholder="e.g. Yield increase, water savings" />
              </div>
              <div className="comm-form-row">
                <label>District / Sector</label>
                <input type="text" placeholder="e.g. Bugesera District, Nyamata Sector" />
              </div>
              <ActionButton variant="primary" onClick={submitPractice}>
                <Send size={14} /> <span>Submit for Validation</span>
              </ActionButton>
              {state.submittedPractices.length ? (
                <div className="comm-submitted-list">
                  {state.submittedPractices.slice(0, 2).map((item) => (
                    <div key={item.id} className="comm-submitted-item">
                      <strong>{item.title}</strong>
                      <span>{item.focus} &middot; {item.status}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </AppCard>
        </div>

        <aside className="comm-sidebar">
          {/* Top Contributors */}
          <AppCard>
            <div className="comm-side-header">
              <Users size={16} />
              <h3>Top Contributors</h3>
            </div>
            {safeContributors.map((item) => {
              const initials = (item.name || "").split(" ").map((w) => w[0]).join("").slice(0, 2);
              return (
                <div key={item.id} className="comm-contrib-row">
                  <div className="comm-contrib-avatar">{initials}</div>
                  <div className="comm-contrib-info">
                    <strong>{item.name}</strong>
                    <span>{item.rank}</span>
                  </div>
                  <div className="comm-contrib-stats">
                    <span className="comm-contrib-count">{item.contributions}</span>
                    <span className="comm-contrib-score">{item.score}%</span>
                  </div>
                </div>
              );
            })}
          </AppCard>

          {/* Training & Events */}
          <AppCard>
            <div className="comm-side-header">
              <CalendarDays size={16} />
              <h3>Training &amp; Events</h3>
            </div>
            {safeEvents.map((event) => (
              <div key={event.id} className="comm-event-card">
                <div className="comm-event-date-badge">
                  <span className="comm-event-day">{(event.date || "").split(" ")[0]}</span>
                  <span className="comm-event-month">{(event.date || "").split(" ")[1]}</span>
                </div>
                <div className="comm-event-body">
                  <h4>{event.title}</h4>
                  <span className="comm-event-type-tag">{event.type}</span>
                  <span className="comm-event-location"><MapPin size={11} /> {event.venue}, {event.region}</span>
                  <span className="comm-event-seats">{event.seatsLeft} seats left</span>
                  <ActionButton size="sm" variant={state.joinedEvents.includes(event.id) ? "secondary" : "primary"} onClick={() => registerEvent(event.id)}>
                    {state.joinedEvents.includes(event.id) ? "Registered" : "Register"}
                  </ActionButton>
                </div>
              </div>
            ))}
          </AppCard>

          {/* Expert Directory */}
          <AppCard>
            <div className="comm-side-header">
              <GraduationCap size={16} />
              <h3>Expert Directory</h3>
            </div>
            {safeExperts.map((item) => {
              const initials = (item.name || "").split(" ").map((w) => w[0]).join("").slice(0, 2);
              return (
                <div key={item.id} className="comm-expert-row">
                  <div className="comm-expert-avatar-sm">{initials}</div>
                  <div className="comm-expert-info">
                    <strong>{item.name}</strong>
                    <span>{item.specialty}</span>
                    <small>{item.organization}</small>
                  </div>
                  <StatusBadge variant="success">Online</StatusBadge>
                  <ActionButton size="sm" variant="ghost" onClick={() => { setSelectedExpert(item.name); setMessage(`${item.name} selected.`); }}>Contact</ActionButton>
                </div>
              );
            })}
          </AppCard>

          {/* Trending Topics */}
          <AppCard>
            <div className="comm-side-header">
              <Waves size={16} />
              <h3>Trending Topics</h3>
            </div>
            <div className="comm-topics-wrap">
              {safeTrendingTopics.map((item) => (
                <span key={item} className="comm-topic-chip">{item}</span>
              ))}
            </div>
          </AppCard>

          {/* Validated Practices */}
          <AppCard>
            <div className="comm-side-header">
              <ShieldCheck size={16} />
              <h3>Validated Practices</h3>
            </div>
            {safePractices.map((item) => (
              <div key={item.id} className="comm-practice-card">
                <div className="comm-practice-title-row">
                  <strong>{item.title}</strong>
                  <StatusBadge variant={item.status === "Expert Verified" ? "success" : "default"}>{item.status}</StatusBadge>
                </div>
                <div className="comm-practice-meta">
                  <span>{item.focus}</span>
                  <span>Rating: {item.rating}</span>
                </div>
              </div>
            ))}
          </AppCard>

          {/* Knowledge Resources */}
          <AppCard>
            <div className="comm-side-header">
              <BookOpenText size={16} />
              <h3>Knowledge Resources</h3>
            </div>
            {safeResources.map((item) => (
              <div key={item.id} className="comm-resource-card">
                <div className="comm-resource-icon"><BookOpenText size={16} /></div>
                <div className="comm-resource-body">
                  <strong>{item.title}</strong>
                  <span className="comm-resource-type">{item.type}</span>
                </div>
                <ActionButton size="sm" variant="ghost" onClick={() => setMessage(`${item.title} will open from the connected knowledge repository.`)}>Open</ActionButton>
              </div>
            ))}
          </AppCard>

          {/* Activity Feed */}
          <AppCard>
            <div className="comm-side-header">
              <Rss size={16} />
              <h3>Activity Feed</h3>
            </div>
            <div className="comm-activity-timeline">
              {safeActivityFeed.map((item) => {
                const AIcon = activityIcons[item.type] || Rss;
                return (
                  <div key={item.id} className="comm-activity-item">
                    <div className="comm-activity-icon"><AIcon size={14} /></div>
                    <div className="comm-activity-content">
                      <strong>{item.title}</strong>
                      <span>{item.type} &middot; {item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        </aside>
      </div>
    </PageShell>
  );
}
