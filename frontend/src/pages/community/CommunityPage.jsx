import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Globe,
  GraduationCap,
  MapPin,
  MessageSquareMore,
  PlusCircle,
  Rss,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const COMMUNITY_STORAGE_KEY = "agri-feed-community-module-v1";

const baseThreads = [
  {
    id: "thread-1",
    title: "Optimization of Nitrogen Application in Winter Wheat",
    body: "Looking for comparative data on split-application versus single-application in semi-arid regions. Are there specific sensor benchmarks we should follow?",
    tag: "Soil Science",
    replies: 24,
    time: "2 hours ago",
    author: "Dr. Elena Moretti",
    validation: 8,
    status: "expert-reviewed",
  },
  {
    id: "thread-2",
    title: "Adapting Precision Irrigation for Small-Scale Horticulture",
    body: "Discussing the economic feasibility of IoT-based drip systems for orchards under 5 hectares. Preliminary findings suggest a 15% yield increase.",
    tag: "Irrigation",
    replies: 18,
    time: "5 hours ago",
    author: "Marcus Thorne",
    validation: 5,
    status: "community-validated",
  },
  {
    id: "thread-3",
    title: "Biological Pest Control Efficacy: Ladybug Larvae vs. Aphids",
    body: "Observations from the last growing season indicate varied results based on humidity levels. Sharing our documented trial data for peer review.",
    tag: "Entomology",
    replies: 12,
    time: "1 day ago",
    author: "Sarah Jenkins",
    validation: 6,
    status: "expert-reviewed",
  },
];

const baseEvents = [
  { id: "event-1", day: "14", month: "Oct", title: "Soil Microbiology Workshop", venue: "Main Research Hall", time: "09:00 AM - 12:00 PM", tone: "green", seats: 12 },
  { id: "event-2", day: "18", month: "Oct", title: "Webinar: Drought Mitigation", venue: "Online (Zoom)", time: "02:00 PM - 03:30 PM", tone: "muted", seats: 48 },
  { id: "event-3", day: "22", month: "Oct", title: "Field Day: Crop Rotation", venue: "Central Test Fields", time: "08:00 AM - 04:00 PM", tone: "muted", seats: 20 },
];

const baseTags = ["#PrecisionAg", "#Hydrology", "#SeedGenetics", "#MarketTrends", "#FertilizerLaws"];

const baseStories = [
  {
    id: "story-1",
    badge: "Sustainability",
    title: "Regenerative Grains: Year 3",
    body: "How the Thompson Farm reduced synthetic fertilizer usage by 40% using diverse cover cropping strategies.",
    tone: "grain",
    climateSmart: true,
  },
  {
    id: "story-2",
    badge: "Technology",
    title: "AI-Driven Orchard Health",
    body: "A cooperative pilot project utilizing automated pest detection drones across 20 participating farms.",
    tone: "orchard",
    climateSmart: false,
  },
];

const initialState = {
  threads: baseThreads,
  stories: baseStories,
  events: baseEvents,
  tags: baseTags,
  expertQuestions: [],
  submissions: [],
  joinedEvents: [],
};

function loadCommunityState() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMUNITY_STORAGE_KEY) || "null");
    return saved ? { ...initialState, ...saved } : initialState;
  } catch {
    return initialState;
  }
}

function saveCommunityState(state) {
  localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(state));
}

export function CommunityPage() {
  const { user } = useAuth();
  const [state, setState] = useState(() => loadCommunityState());
  const [threadQuery, setThreadQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [expertQuestion, setExpertQuestion] = useState("");
  const [submissionTitle, setSubmissionTitle] = useState("");
  const [submissionBody, setSubmissionBody] = useState("");
  const [submissionTag, setSubmissionTag] = useState("Climate-smart");

  useEffect(() => {
    saveCommunityState(state);
  }, [state]);

  const filteredThreads = useMemo(() => {
    return state.threads.filter((thread) => {
      const matchesQuery =
        !threadQuery.trim() ||
        [thread.title, thread.body, thread.tag, thread.author]
          .join(" ")
          .toLowerCase()
          .includes(threadQuery.trim().toLowerCase());
      const matchesTag = activeTag === "All" || thread.tag === activeTag;
      return matchesQuery && matchesTag;
    });
  }, [activeTag, state.threads, threadQuery]);

  const communityMetrics = useMemo(
    () => [
      { label: "Forum Threads", value: state.threads.length, icon: MessageSquareMore },
      { label: "Expert Questions", value: state.expertQuestions.length, icon: CircleHelp },
      { label: "Validated Practices", value: state.submissions.length, icon: ShieldCheck },
      { label: "Training Events", value: state.events.length, icon: CalendarDays },
    ],
    [state.events.length, state.expertQuestions.length, state.submissions.length, state.threads.length]
  );

  const uniqueTags = useMemo(
    () => ["All", ...new Set(state.threads.map((thread) => thread.tag))],
    [state.threads]
  );

  const addValidation = (threadId) => {
    setState((current) => ({
      ...current,
      threads: current.threads.map((thread) =>
        thread.id === threadId ? { ...thread, validation: thread.validation + 1 } : thread
      ),
    }));
  };

  const joinEvent = (eventId) => {
    setState((current) => ({
      ...current,
      joinedEvents: current.joinedEvents.includes(eventId)
        ? current.joinedEvents
        : [...current.joinedEvents, eventId],
    }));
  };

  const handleExpertSubmit = () => {
    const trimmed = expertQuestion.trim();
    if (!trimmed) return;

    setState((current) => ({
      ...current,
      expertQuestions: [
        {
          id: `q-${Date.now()}`,
          question: trimmed,
          askedBy: user?.name || "Community Member",
          status: "Queued for expert review",
        },
        ...current.expertQuestions,
      ],
    }));
    setExpertQuestion("");
  };

  const handleSubmission = () => {
    const title = submissionTitle.trim();
    const body = submissionBody.trim();
    if (!title || !body) return;

    const story = {
      id: `story-${Date.now()}`,
      badge: submissionTag,
      title,
      body,
      tone: submissionTag === "Climate-smart" ? "grain" : "orchard",
      climateSmart: submissionTag === "Climate-smart",
    };

    setState((current) => ({
      ...current,
      submissions: [
        {
          id: `sub-${Date.now()}`,
          title,
          body,
          tag: submissionTag,
          author: user?.name || "Farmer",
          status: "Pending community validation",
        },
        ...current.submissions,
      ],
      stories: [story, ...current.stories],
    }));

    setSubmissionTitle("");
    setSubmissionBody("");
    setSubmissionTag("Climate-smart");
  };

  return (
    <section className="management-page prototype-community-page functional-community-page">
      <div className="page-title-block prototype-community-title">
        <h1>Community &amp; Knowledge Sharing</h1>
        <p>
          A peer-to-peer learning and expert-led knowledge platform for validating climate-smart
          agricultural practices and sharing field-tested advice.
        </p>
      </div>

      <div className="community-metric-strip">
        {communityMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="prototype-panel community-metric-card">
              <div className="community-metric-icon">
                <Icon size={17} />
              </div>
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="community-control-row">
        <label className="prototype-inline-search compact wide">
          <Search size={16} />
          <input
            type="text"
            value={threadQuery}
            onChange={(event) => setThreadQuery(event.target.value)}
            placeholder="Search discussion board, expert notes, or best practices..."
          />
        </label>

        <div className="community-tag-filters">
          {uniqueTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? "community-filter-chip active" : "community-filter-chip"}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="prototype-community-grid">
        <div className="prototype-community-main">
          <article className="prototype-panel prototype-community-threads">
            <div className="prototype-community-section-head soft-green">
              <h2>
                <MessageSquareMore size={19} />
                <span>Farmer Discussion Board</span>
              </h2>
              <button type="button" className="prototype-community-viewall">
                {filteredThreads.length} visible
              </button>
            </div>

            <div className="prototype-community-thread-list">
              {filteredThreads.map((thread) => (
                <article key={thread.id} className="prototype-community-thread">
                  <div className="prototype-community-thread-top">
                    <div>
                      <h3>{thread.title}</h3>
                      <span className="community-thread-status">{thread.status}</span>
                    </div>
                    <span className="prototype-community-thread-tag">{thread.tag}</span>
                  </div>
                  <p>{thread.body}</p>
                  <div className="prototype-community-thread-meta">
                    <span><MessageSquareMore size={14} /> {thread.replies} replies</span>
                    <span><Clock3 size={14} /> {thread.time}</span>
                    <span>By {thread.author}</span>
                  </div>
                  <div className="community-thread-actions">
                    <button type="button" className="community-action-button soft" onClick={() => addValidation(thread.id)}>
                      <ThumbsUp size={15} />
                      <span>Validate ({thread.validation})</span>
                    </button>
                    <button type="button" className="community-action-button ghost">
                      <Sparkles size={15} />
                      <span>Promote best practice</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="prototype-panel prototype-community-expert">
            <div className="prototype-community-expert-icon">
              <BookOpenText size={26} />
            </div>
            <div className="prototype-community-expert-copy">
              <h2>Expert Q&amp;A Section</h2>
              <p>
                Direct access to university-affiliated researchers and certified agronomists. Submit
                questions for evidence-based responses and expert-led content guidance.
              </p>
              <div className="community-expert-form">
                <textarea
                  rows="3"
                  value={expertQuestion}
                  onChange={(event) => setExpertQuestion(event.target.value)}
                  placeholder="Ask an expert about pests, climate-smart planting windows, irrigation, soil health..."
                />
                <div className="prototype-community-expert-actions">
                  <button type="button" className="prototype-community-green-button" onClick={handleExpertSubmit}>
                    <Send size={15} />
                    <span>Submit Question</span>
                  </button>
                  <button type="button" className="prototype-community-outline-button">
                    Browse Q&amp;A Archive
                  </button>
                </div>
              </div>
              {state.expertQuestions.length ? (
                <div className="community-inline-list">
                  {state.expertQuestions.slice(0, 2).map((question) => (
                    <div key={question.id} className="community-inline-item">
                      <strong>{question.askedBy}</strong>
                      <span>{question.status}</span>
                      <p>{question.question}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </article>

          <article className="prototype-panel community-submission-card">
            <div className="prototype-community-section-head">
              <h2>
                <PlusCircle size={19} />
                <span>Submit Local Best Practice</span>
              </h2>
            </div>
            <div className="community-submission-grid">
              <label className="community-field">
                <span>Practice Title</span>
                <input
                  type="text"
                  value={submissionTitle}
                  onChange={(event) => setSubmissionTitle(event.target.value)}
                  placeholder="e.g. Residue mulching for dry-season moisture retention"
                />
              </label>
              <label className="community-field">
                <span>Category</span>
                <select value={submissionTag} onChange={(event) => setSubmissionTag(event.target.value)}>
                  <option>Climate-smart</option>
                  <option>Soil Health</option>
                  <option>Irrigation</option>
                  <option>Market Access</option>
                </select>
              </label>
              <label className="community-field full">
                <span>What worked and how was it validated?</span>
                <textarea
                  rows="4"
                  value={submissionBody}
                  onChange={(event) => setSubmissionBody(event.target.value)}
                  placeholder="Describe the practice, results, yield change, and how the community or extension officers can validate it."
                />
              </label>
            </div>
            <div className="community-submission-actions">
              <button type="button" className="prototype-community-green-button" onClick={handleSubmission}>
                <CheckCircle2 size={15} />
                <span>Submit for validation</span>
              </button>
            </div>
            {state.submissions.length ? (
              <div className="community-submission-list">
                {state.submissions.slice(0, 2).map((item) => (
                  <div key={item.id} className="community-submission-item">
                    <strong>{item.title}</strong>
                    <span>{item.tag} · {item.status}</span>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          <div className="prototype-community-story-head">
            <h2>Success Stories &amp; Case Studies</h2>
            <div className="prototype-community-story-nav">
              <button type="button">‹</button>
              <button type="button">›</button>
            </div>
          </div>

          <div className="prototype-community-story-grid">
            {state.stories.map((story) => (
              <article key={story.id} className="prototype-panel prototype-community-story-card">
                <div className={`prototype-community-story-image ${story.tone}`}>
                  <span>{story.badge}</span>
                  <strong>{story.title}</strong>
                </div>
                <div className="prototype-community-story-body">
                  <p>{story.body}</p>
                  <div className="community-story-foot">
                    {story.climateSmart ? (
                      <small><Sparkles size={14} /> Climate-smart practice</small>
                    ) : (
                      <small><ShieldCheck size={14} /> Expert-led case study</small>
                    )}
                    <button type="button" className="prototype-community-read-link">Read Case Study →</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="prototype-community-side">
          <article className="prototype-panel prototype-community-calendar">
            <div className="prototype-community-section-head">
              <h2>
                <CalendarDays size={19} />
                <span>Event &amp; Training Calendar</span>
              </h2>
            </div>

            <div className="prototype-community-event-list">
              {state.events.map((event) => (
                <div key={event.id} className="prototype-community-event">
                  <div className={`prototype-community-date ${event.tone}`}>
                    <strong>{event.day}</strong>
                    <span>{event.month}</span>
                  </div>
                  <div>
                    <h3>{event.title}</h3>
                    <p><MapPin size={13} /> {event.venue}</p>
                    <small>{event.time}</small>
                    <div className="community-event-foot">
                      <span>{event.seats} seats left</span>
                      <button
                        type="button"
                        className="community-event-join"
                        onClick={() => joinEvent(event.id)}
                      >
                        {state.joinedEvents.includes(event.id) ? "Joined" : "Join"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="prototype-community-calendar-button">View Full Calendar</button>

            <div className="prototype-community-tag-section">
              <h3>Knowledge Tags</h3>
              <div className="prototype-community-tags">
                {state.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </article>
        </aside>
      </div>

      <footer className="prototype-community-footer">
        <div className="prototype-community-footer-grid">
          <div>
            <div className="prototype-community-footer-brand">
              <div className="brand-mark prototype-community-brand-mark">
                <GraduationCap size={16} />
              </div>
              <strong>AgriKnow</strong>
            </div>
            <p>Dedicated to advancing agricultural excellence through collaborative research and community support.</p>
          </div>

          <div>
            <h4>Navigation</h4>
            <a>Decision Support</a>
            <a>Research Papers</a>
            <a>Data Visualizer</a>
            <a>Expert Directory</a>
          </div>

          <div>
            <h4>Community</h4>
            <a>Discussion Forums</a>
            <a>Training Events</a>
            <a>Success Stories</a>
            <a>Member Portal</a>
          </div>

          <div>
            <h4>Institutional</h4>
            <a>Partner Universities</a>
            <a>Legal &amp; Privacy</a>
            <a>Funding Reports</a>
            <a>Contact Admin</a>
          </div>
        </div>

        <div className="prototype-community-footer-bottom">
          <span>© 2024 AgriKnow Support System. Academic Web Prototype.</span>
          <div className="prototype-community-footer-icons">
            <Globe size={16} />
            <CircleHelp size={16} />
            <Rss size={16} />
          </div>
        </div>
      </footer>
    </section>
  );
}
