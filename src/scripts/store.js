/**
 * Space Portfolio Client-Side Reactive Store & Data Engine
 * 
 * Manages reactive state via localStorage with SSR fallback to src/data/portfolio.json.
 * Tracks course syllabi, telemetry metrics, and activity events for the Habit Tracker.
 * Dispatches 'portfolio-data-updated' CustomEvent on all mutations.
 */
import defaultPortfolioData from '../data/portfolio.json' with { type: 'json' };

const STORAGE_KEY = 'space_portfolio_data_v1';
// ponytail: v2 session key requiring strict username + password
const AUTH_KEY = 'space_portfolio_admin_session_v2';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'NhatNguyen141';
const UPDATES_KEY = 'space_portfolio_update_count';
const ACTIVITY_LOG_KEY = 'space_portfolio_activity_log';
const EVENT_NAME = 'portfolio-data-updated';

// Helper to test browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Deep clone helper
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('Deep clone error:', e);
    return obj;
  }
}

// Native date formatter to YYYY-MM-DD avoiding UTC offset issues
function formatDate(d) {
  const dateObj = d instanceof Date ? d : new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// In-memory fallback / cache
let memoryData = deepClone(defaultPortfolioData);
let memoryUpdateCount = 24;

/**
 * Get current website update / revision count
 */
export function getUpdateCount() {
  if (!isBrowser) {
    return memoryUpdateCount;
  }
  try {
    const raw = localStorage.getItem(UPDATES_KEY);
    if (!raw) {
      localStorage.setItem(UPDATES_KEY, String(memoryUpdateCount));
      return memoryUpdateCount;
    }
    const val = parseInt(raw, 10);
    return isNaN(val) ? memoryUpdateCount : val;
  } catch (err) {
    return memoryUpdateCount;
  }
}

/**
 * Increment website update count by 1 and persist
 */
export function incrementUpdateCount() {
  memoryUpdateCount += 1;
  if (isBrowser) {
    try {
      const current = getUpdateCount();
      const next = current + 1;
      localStorage.setItem(UPDATES_KEY, String(next));
      memoryUpdateCount = next;
    } catch (err) {
      console.error('Failed to increment update count:', err);
    }
  }
  return memoryUpdateCount;
}

/**
 * Get dynamic live dashboard telemetry stats:
 * { blogsCount, achievementsCount, coursesCount, activitiesCount, updatesCount }
 */
export function getDashboardStats() {
  const current = getData();
  const blogsCount = (current.blogs || []).length;
  const achievementsCount = (current.achievements || []).length;
  const coursesCount = (current.courses || []).length;
  const activitiesCount = getActivityLog().length;
  const updatesCount = getUpdateCount();
  return {
    blogsCount,
    achievementsCount,
    coursesCount,
    activitiesCount,
    updatesCount
  };
}

/**
 * Get the full portfolio data object
 */
export function getData() {
  if (!isBrowser) {
    return memoryData;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First time initialization in browser
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPortfolioData));
      memoryData = deepClone(defaultPortfolioData);
      return memoryData;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.profile && parsed.profile.name === 'Võ Quang Nhật Nguyên') {
      parsed.profile.name = 'VO QUANG NHAT NGUYEN';
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch (e) {}
    }

    // Ensure courses and activities exist in parsed data from local storage
    let needsResave = false;
    if (!Array.isArray(parsed.courses)) {
      parsed.courses = deepClone(defaultPortfolioData.courses || []);
      needsResave = true;
    }
    if (!Array.isArray(parsed.activities)) {
      parsed.activities = deepClone(defaultPortfolioData.activities || []);
      needsResave = true;
    }
    if (needsResave) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch (e) {}
    }

    memoryData = parsed;
    return parsed;
  } catch (err) {
    console.warn('Failed to read from localStorage, using fallback:', err);
    return memoryData;
  }
}

/**
 * Save data to localStorage and emit change event.
 * Automatically increments website update counter and syncs telemetryStats.
 */
export function saveData(newData) {
  // Increment update counter on every mutation
  const updatedRevision = incrementUpdateCount();

  // Synchronize telemetry stats on profile if present
  if (newData.profile && Array.isArray(newData.profile.telemetryStats)) {
    const blogsCount = (newData.blogs || []).length;
    const coursesCount = (newData.courses || []).length;

    newData.profile.telemetryStats = newData.profile.telemetryStats.map(stat => {
      const labelLower = (stat.label || '').toLowerCase();
      const key = stat.key || '';
      if (key === 'updates' || labelLower.includes('update') || labelLower.includes('revision')) {
        return { ...stat, value: String(updatedRevision) };
      }
      if (key === 'blogs' || labelLower.includes('blog')) {
        return { ...stat, value: String(blogsCount) };
      }
      if (key === 'archive' || labelLower.includes('archive')) {
        return { ...stat, value: 'GitHub' };
      }
      if (key === 'courses' || labelLower.includes('course')) {
        return { ...stat, value: String(coursesCount) };
      }
      return stat;
    });
  }

  memoryData = deepClone(newData);

  if (isBrowser) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }

    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: deepClone(newData),
          bubbles: true
        })
      );
    } catch (err) {
      console.error('Failed to dispatch event:', err);
    }
  }

  return memoryData;
}

/**
 * Dispatch reactive update event manually if needed
 */
export function notifySubscribers() {
  if (isBrowser) {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: getData(),
        bubbles: true
      })
    );
  }
}

/**
 * Helper to slugify strings for URLs and IDs
 */
export function slugify(text) {
  if (!text) return `entry-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Calculate estimated reading time from markdown/text content
 */
export function calculateReadTime(content) {
  if (!content) return '3 min read';
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Get profile avatar URL / Base64 string
 */
export function getProfileAvatar() {
  const current = getData();
  return current.profile?.avatar || defaultPortfolioData.profile?.avatar || '';
}

/**
 * Update profile avatar (Base64 dataUrl or image URL)
 */
export function updateProfileAvatar(dataUrlOrUrl) {
  const current = getData();
  if (!current.profile) current.profile = {};
  current.profile.avatar = dataUrlOrUrl;
  saveData(current);
  logActivity('cv', 'Updated Profile Avatar', 'New mission portrait uploaded');
  return dataUrlOrUrl;
}

/**
 * Get rich HTML document representation of CV (for Word-style editing)
 */
export function getCVDocumentHtml() {
  const current = getData();
  return current.profile?.cvDocumentHtml || '';
}

/**
 * Update rich HTML document representation of CV (from Word-style editor)
 */
export function updateCVDocumentHtml(html) {
  const current = getData();
  if (!current.profile) current.profile = {};
  current.profile.cvDocumentHtml = html;
  saveData(current);
  logActivity('cv', 'Updated CV Document', 'Word-style document revised');
  return html;
}

// ==========================================
// 1. HARVARD CV METHODS
// ==========================================

/**
 * Get structured Harvard CV data
 */
export function getCVData() {
  const current = getData();
  return {
    profile: current.profile || {},
    education: current.education || [],
    experience: current.experience || [],
    missions: current.missions || [],
    achievements: current.achievements || [],
    publications: current.publications || [],
    skills: current.skills || [],
    timeline: current.timeline || [],
    projects: current.projects || []
  };
}

/**
 * Update CV Data
 * Can be called either as:
 * - updateCVData('profile', { ... })
 * - updateCVData({ profile: { ... }, education: [ ... ] })
 */
export function updateCVData(sectionOrFull, maybeData) {
  const current = getData();

  if (typeof sectionOrFull === 'string' && maybeData !== undefined) {
    // Section-specific update
    current[sectionOrFull] = maybeData;
  } else if (typeof sectionOrFull === 'object' && sectionOrFull !== null) {
    // Multi-section merge
    Object.keys(sectionOrFull).forEach((key) => {
      current[key] = sectionOrFull[key];
    });
  }

  saveData(current);
  const sectionLabel = typeof sectionOrFull === 'string' ? sectionOrFull : 'Dossier';
  logActivity('cv', `CV Updated: ${sectionLabel}`, 'Modified academic credentials & records');
  return getCVData();
}

/**
 * Alias for updateCVData
 */
export function saveCVData(sectionOrFull, maybeData) {
  return updateCVData(sectionOrFull, maybeData);
}

// ==========================================
// 2. TECHNICAL ACHIEVEMENTS & AWARDS METHODS
// ==========================================

/**
 * Get all achievements (sorted by timeline descending)
 */
export function getAchievements() {
  const current = getData();
  const achievements = current.achievements || [];
  return [...achievements].sort((a, b) => {
    const dateA = a.timeline || a.date || '';
    const dateB = b.timeline || b.date || '';
    return dateB.localeCompare(dateA);
  });
}

/**
 * Add a new achievement with exact date / timeline
 */
export function addAchievement(achievement) {
  const current = getData();
  if (!current.achievements) current.achievements = [];

  const newAch = {
    id: achievement.id || `ach-${Date.now()}`,
    title: achievement.title || 'Untitled Achievement',
    date: achievement.date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    timeline: achievement.timeline || new Date().toISOString().split('T')[0],
    organization: achievement.organization || 'Astraea Space Labs',
    category: achievement.category || 'Technical Achievement',
    metrics: achievement.metrics || '',
    description: achievement.description || '',
    ...achievement
  };

  current.achievements.unshift(newAch);

  // Keep timeline sync if title and organization provided
  if (!current.timeline) current.timeline = [];
  const existingTimelineIdx = current.timeline.findIndex(t => t.summary?.includes(newAch.title));
  if (existingTimelineIdx === -1) {
    current.timeline.unshift({
      period: newAch.date,
      role: newAch.title,
      organization: newAch.organization,
      location: 'Flight Operations',
      badge: newAch.category,
      summary: newAch.description,
      highlights: [newAch.metrics || newAch.description],
      tags: [newAch.category]
    });
  }

  saveData(current);
  logActivity('achievement', newAch.title, newAch.organization || 'Conferred milestone', newAch.timeline || null);
  return newAch;
}

/**
 * Update an existing achievement by ID
 */
export function updateAchievement(id, updated) {
  const current = getData();
  if (!current.achievements) return null;

  const index = current.achievements.findIndex((a) => a.id === id);
  if (index === -1) return null;

  current.achievements[index] = {
    ...current.achievements[index],
    ...updated,
    id // Preserve original ID
  };

  saveData(current);
  logActivity('achievement', updated.title || current.achievements[index].title || 'Milestone Updated', 'Modified milestone details');
  return current.achievements[index];
}

/**
 * Delete an achievement by ID
 */
export function deleteAchievement(id) {
  const current = getData();
  if (!current.achievements) return false;

  const originalLength = current.achievements.length;
  current.achievements = current.achievements.filter((a) => a.id !== id);

  if (current.achievements.length !== originalLength) {
    saveData(current);
    return true;
  }
  return false;
}

// ==========================================
// 3. BLOG POSTS METHODS
// ==========================================

/**
 * Get all technical blog posts
 */
export function getBlogs() {
  const current = getData();
  const blogs = current.blogs || [];
  return [...blogs].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });
}

/**
 * Get a single blog post by slug or ID
 */
export function getBlogBySlug(slugOrId) {
  const blogs = getBlogs();
  return blogs.find((b) => b.slug === slugOrId || b.id === slugOrId) || null;
}

/**
 * Add a new blog post
 */
export function addBlog(blog) {
  const current = getData();
  if (!current.blogs) current.blogs = [];

  const title = blog.title || 'Untitled Space Engineering Note';
  const slug = blog.slug ? slugify(blog.slug) : slugify(title);
  const content = blog.content || '';
  const readTime = blog.readTime || calculateReadTime(content);
  const now = new Date();
  const dateStr = blog.date || formatDate(now);

  const newPost = {
    id: blog.id || `post-${Date.now()}`,
    slug: slug,
    title: title,
    date: dateStr,
    readTime: readTime,
    category: blog.category || 'Flight Software',
    tags: Array.isArray(blog.tags) ? blog.tags : (blog.tags ? [blog.tags] : ['Aerospace', 'Flight Software']),
    author: blog.author || {
      name: current.profile?.name || 'VO QUANG NHAT NGUYEN',
      role: current.profile?.title || 'Flight Software Architect',
      callsign: current.profile?.callsign || 'NHAT-NGUYEN'
    },
    summary: blog.summary || (content.length > 150 ? content.slice(0, 150) + '...' : content),
    content: content,
    ...blog,
    // Ensure slug and id are prioritized
    id: blog.id || `post-${Date.now()}`,
    slug: slug
  };

  current.blogs.unshift(newPost);
  saveData(current);
  logActivity('blog', newPost.title, newPost.summary || 'Published technical dispatch', newPost.date || null);
  return newPost;
}

/**
 * Update a blog post by slug or ID
 */
export function updateBlog(slugOrId, updated) {
  const current = getData();
  if (!current.blogs) return null;

  const index = current.blogs.findIndex((b) => b.slug === slugOrId || b.id === slugOrId);
  if (index === -1) return null;

  const existing = current.blogs[index];
  const newContent = updated.content !== undefined ? updated.content : existing.content;
  const newReadTime = updated.readTime || (updated.content ? calculateReadTime(newContent) : existing.readTime);
  const newSlug = updated.slug ? slugify(updated.slug) : (updated.title && updated.title !== existing.title ? slugify(updated.title) : existing.slug);

  current.blogs[index] = {
    ...existing,
    ...updated,
    slug: newSlug,
    readTime: newReadTime
  };

  saveData(current);
  logActivity('blog', updated.title || current.blogs[index].title || 'Blog Updated', 'Revised technical dispatch');
  return current.blogs[index];
}

/**
 * Delete a blog post by slug or ID
 */
export function deleteBlog(slugOrId) {
  const current = getData();
  if (!current.blogs) return false;

  const originalLength = current.blogs.length;
  current.blogs = current.blogs.filter((b) => b.slug !== slugOrId && b.id !== slugOrId);

  if (current.blogs.length !== originalLength) {
    saveData(current);
    return true;
  }
  return false;
}

// ==========================================
// 4. COURSES & ACADEMIC DOSSIER METHODS
// ==========================================

/**
 * Get all courses from store with fallback to portfolio.json
 */
export function getCourses() {
  const current = getData();
  if (Array.isArray(current.courses)) {
    return [...current.courses];
  }
  return [...(defaultPortfolioData.courses || [])];
}

/**
 * Get a single course by ID or code
 */
export function getCourseById(idOrCode) {
  const courses = getCourses();
  return courses.find((c) => c.id === idOrCode || c.code === idOrCode) || null;
}

/**
 * Add a new course, save to localStorage, and log activity
 */
export function addCourse(courseData) {
  const current = getData();
  if (!current.courses) current.courses = [];

  const now = new Date();
  const dateStr = formatDate(now);
  const id = courseData.id || `course-${slugify(courseData.code || courseData.title || Date.now())}`;

  const tags = Array.isArray(courseData.tags)
    ? courseData.tags
    : (typeof courseData.tags === 'string' ? courseData.tags.split(',').map(t => t.trim()).filter(Boolean) : []);

  const newCourse = {
    id,
    code: courseData.code || 'ENG 100',
    title: courseData.title || 'Untitled Aerospace Course',
    semester: courseData.semester || 'Fall 2026',
    institution: courseData.institution || 'Caltech / Aero Department',
    description: courseData.description || '',
    instructorEmail: courseData.instructorEmail || 'nhatnguyen@orbital-flight.dev',
    githubUrl: courseData.githubUrl || 'https://github.com/grezil',
    tags,
    updatedAt: courseData.updatedAt || dateStr,
    ...courseData,
    id,
    tags
  };

  current.courses.unshift(newCourse);
  saveData(current);
  logActivity('course', newCourse.title, 'Published syllabus & materials');
  return newCourse;
}

/**
 * Update an existing course by ID and log activity
 */
export function updateCourse(id, patch) {
  const current = getData();
  if (!current.courses) return null;

  const index = current.courses.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const tags = patch.tags !== undefined
    ? (Array.isArray(patch.tags) ? patch.tags : (typeof patch.tags === 'string' ? patch.tags.split(',').map(t => t.trim()).filter(Boolean) : []))
    : current.courses[index].tags;

  current.courses[index] = {
    ...current.courses[index],
    ...patch,
    tags,
    id,
    updatedAt: patch.updatedAt || formatDate(new Date())
  };

  saveData(current);
  logActivity('course', patch.title || current.courses[index].title || 'Course Updated', 'Updated syllabus or materials');
  return current.courses[index];
}

/**
 * Delete a course by ID
 */
export function deleteCourse(id) {
  const current = getData();
  if (!current.courses || !Array.isArray(current.courses)) return false;

  const originalLength = current.courses.length;
  current.courses = current.courses.filter((c) => c.id !== id);

  if (current.courses.length !== originalLength) {
    saveData(current);
    logActivity('course', 'Course Archive Removed', 'Deleted syllabus & materials');
    return true;
  }
  return false;
}

// ==========================================
// 5. ACTIVITY LOG & HABIT TRACKER ENGINE
// ==========================================

/**
 * Get all activities from localStorage (space_portfolio_activity_log)
 * with fallback to defaultPortfolioData.activities.
 */
export function getActivityLog() {
  if (isBrowser) {
    try {
      const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read activity log from localStorage:', e);
    }
  }

  const current = getData();
  const fallback = (current.activities && current.activities.length > 0)
    ? current.activities
    : (defaultPortfolioData.activities || []);

  if (isBrowser) {
    try {
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(fallback));
    } catch (e) {}
  }
  return fallback;
}

/**
 * Log an activity event to the Habit Tracker.
 * Persists to space_portfolio_activity_log, increments update counter,
 * and dispatches 'portfolio-data-updated'.
 *
 * @param {('blog'|'cv'|'course'|'achievement')} type
 * @param {string} title
 * @param {string} detail
 * @param {string} [customDate] - Format YYYY-MM-DD
 */
export function logActivity(type, title, detail = '', customDate = null) {
  const dateStr = customDate || formatDate(new Date());
  const newActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: dateStr,
    type: type || 'blog',
    title: title || 'Telemetry Update',
    detail: detail || ''
  };

  const activities = getActivityLog();
  const updatedActivities = [newActivity, ...activities];

  if (isBrowser) {
    try {
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(updatedActivities));
    } catch (err) {
      console.error('Failed to persist activity log:', err);
    }
  }

  // Also synchronize in main storage
  const current = getData();
  current.activities = updatedActivities;
  memoryData.activities = updatedActivities;
  if (isBrowser) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {}
  }

  // Increment website update count
  incrementUpdateCount();

  // Dispatch reactive event
  if (isBrowser) {
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            ...current,
            activities: updatedActivities,
            latestActivity: newActivity
          },
          bubbles: true
        })
      );
    } catch (err) {
      console.error('Failed to dispatch activity event:', err);
    }
  }

  return newActivity;
}

/**
 * Compute Contribution Calendar Heatmap Data
 * 
 * @param {number|string} [targetYear] - e.g. 2026, 2025, or omitted for rolling 52 weeks
 * @param {string} [typeFilter='all'] - 'all' | 'blog' | 'cv' | 'course' | 'achievement'
 * @returns {{
 *   cells: Record<string, { date: string, count: number, level: number, activities: any[], dayOfWeek: number, isFuture: boolean }>,
 *   weeks: Array<Array<any>>,
 *   days: Array<any>,
 *   totalCount: number,
 *   currentStreak: number,
 *   longestStreak: number,
 *   activeDaysCount: number,
 *   startDate: string,
 *   endDate: string
 * }}
 */
export function getActivityHeatmapData(targetYear = null, typeFilter = 'all') {
  let allActivities = getActivityLog();
  if (typeFilter && typeFilter !== 'all') {
    allActivities = allActivities.filter((act) => act && act.type === typeFilter);
  }
  const now = new Date();
  const todayStr = formatDate(now);
  const currentYear = now.getFullYear();

  let startDate, endDate;

  if (targetYear && Number(targetYear) !== currentYear && !isNaN(Number(targetYear))) {
    const y = Number(targetYear);
    const startYear = new Date(y, 0, 1);
    const endYear = new Date(y, 11, 31);

    // Align start to preceding Sunday
    startDate = new Date(startYear.getFullYear(), startYear.getMonth(), startYear.getDate());
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Align end to following Saturday
    endDate = new Date(endYear.getFullYear(), endYear.getMonth(), endYear.getDate());
    endDate.setDate(endDate.getDate() + (6 - endYear.getDay()));
  } else {
    // 52-week rolling window ending on the coming Saturday of current week
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay()));

    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (52 * 7 - 1));
  }

  // Group all activities by YYYY-MM-DD
  const dateToActivities = {};
  allActivities.forEach((act) => {
    if (!act || !act.date) return;
    const d = String(act.date).trim();
    if (!dateToActivities[d]) {
      dateToActivities[d] = [];
    }
    dateToActivities[d].push(act);
  });

  const cells = {};
  const weeks = [];
  const days = [];
  let currentWeek = [];

  let totalCount = 0;
  let activeDaysCount = 0;

  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cursor <= finalDate) {
    const dStr = formatDate(cursor);
    const dayOfWeek = cursor.getDay(); // 0 is Sun, 6 is Sat
    const dayActs = dateToActivities[dStr] || [];
    const count = dayActs.length;

    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count === 3) level = 3;
    else if (count >= 4) level = 4;

    const isFuture = dStr > todayStr;

    if (!isFuture && count > 0) {
      activeDaysCount++;
    }
    totalCount += count;

    const cellObj = {
      date: dStr,
      count,
      level,
      activities: dayActs,
      dayOfWeek,
      isFuture
    };

    cells[dStr] = cellObj;
    days.push(cellObj);
    currentWeek.push(cellObj);

    if (dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Calculate Streaks
  // Current streak: consecutive days ending today (or yesterday if today has no activity yet)
  let currentStreak = 0;
  const parts = todayStr.split('-').map(Number);
  const streakCursor = new Date(parts[0], parts[1] - 1, parts[2]);

  const todayCount = (dateToActivities[todayStr] || []).length;
  if (todayCount > 0) {
    currentStreak = 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  } else {
    // Check yesterday
    streakCursor.setDate(streakCursor.getDate() - 1);
    const yestStr = formatDate(streakCursor);
    if ((dateToActivities[yestStr] || []).length > 0) {
      currentStreak = 1;
      streakCursor.setDate(streakCursor.getDate() - 1);
    }
  }

  if (currentStreak > 0) {
    while (true) {
      const prevDateStr = formatDate(streakCursor);
      if ((dateToActivities[prevDateStr] || []).length > 0) {
        currentStreak++;
        streakCursor.setDate(streakCursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest streak across all recorded activities
  let longestStreak = 0;
  let runningStreak = 0;

  const allActiveDates = Object.keys(dateToActivities)
    .filter((d) => (dateToActivities[d] || []).length > 0)
    .sort();

  if (allActiveDates.length > 0) {
    const pStart = allActiveDates[0].split('-').map(Number);
    const pEnd = allActiveDates[allActiveDates.length - 1].split('-').map(Number);
    const sweep = new Date(pStart[0], pStart[1] - 1, pStart[2]);
    const sweepEnd = new Date(pEnd[0], pEnd[1] - 1, pEnd[2]);

    while (sweep <= sweepEnd) {
      const s = formatDate(sweep);
      if ((dateToActivities[s] || []).length > 0) {
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
      sweep.setDate(sweep.getDate() + 1);
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    cells,
    weeks,
    days,
    totalCount,
    currentStreak,
    longestStreak,
    activeDaysCount,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

// ==========================================
// 6. ADMIN AUTHENTICATION METHODS
// ==========================================

/**
 * Check if the user is currently logged in as Admin
 * ponytail: strict verification of session object, invalidating legacy 'true' strings
 */
export function checkAdminAuth() {
  if (!isBrowser) return false;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    return session && session.user === VALID_USERNAME && session.authenticated === true;
  } catch (err) {
    return false;
  }
}

/**
 * Attempt Admin login with username and password
 * Required credentials: username === 'admin' && password === 'NhatNguyen141'
 * ponytail: supports loginAdmin(username, password) or loginAdmin({ username, password })
 */
export function loginAdmin(usernameOrObj, maybePassword) {
  let username = '';
  let password = '';

  if (typeof usernameOrObj === 'object' && usernameOrObj !== null) {
    username = usernameOrObj.username || '';
    password = usernameOrObj.password || usernameOrObj.passkey || '';
  } else if (maybePassword !== undefined) {
    username = usernameOrObj || '';
    password = maybePassword || '';
  } else {
    username = '';
    password = usernameOrObj || '';
  }

  username = String(username).trim();
  password = String(password).trim();

  if (!username) {
    return { success: false, error: 'Vui lòng nhập tên tài khoản (username).' };
  }
  if (!password) {
    return { success: false, error: 'Vui lòng nhập mật khẩu (password).' };
  }

  // Strict check: username: admin, password: NhatNguyen141
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    if (isBrowser) {
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({
          user: VALID_USERNAME,
          authenticated: true,
          authAt: Date.now()
        }));
        // Clean out legacy keys from older sessions
        localStorage.removeItem('space_portfolio_admin_auth');
        localStorage.removeItem('astro_admin_auth');
        localStorage.removeItem('portfolio_admin_authenticated');
        localStorage.removeItem('astro_portfolio_auth');
      } catch (err) {
        console.error('Error saving admin auth session:', err);
      }
    }
    notifySubscribers();
    return { success: true };
  } else {
    return { success: false, error: 'Tên tài khoản hoặc mật khẩu không chính xác.' };
  }
}

/**
 * Logout of Admin mode
 */
export function logoutAdmin() {
  if (isBrowser) {
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem('space_portfolio_admin_auth');
      localStorage.removeItem('astro_admin_auth');
      localStorage.removeItem('portfolio_admin_authenticated');
      localStorage.removeItem('astro_portfolio_auth');
    } catch (err) {
      console.error('Error clearing admin auth session:', err);
    }
  }
  notifySubscribers();
  return true;
}

/**
 * Update Admin passkey (Requires current admin auth)
 */
export function updateAdminPasskey(newPasskey) {
  if (!checkAdminAuth() && isBrowser) {
    return { success: false, error: 'Unauthorized: Admin authentication required' };
  }
  if (!newPasskey || newPasskey.length < 4) {
    return { success: false, error: 'Passkey must be at least 4 characters' };
  }

  const current = getData();
  if (!current.admin) current.admin = {};
  current.admin.passkey = newPasskey;
  saveData(current);
  return { success: true };
}

// ==========================================
// 7. BACKUP, IMPORT, EXPORT & RESET
// ==========================================

/**
 * Export full portfolio dataset as formatted JSON string
 */
export function exportDataJSON() {
  return JSON.stringify(getData(), null, 2);
}

/**
 * Import and replace dataset from JSON string
 */
export function importDataJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.profile || typeof parsed !== 'object') {
      throw new Error('Invalid portfolio JSON schema');
    }
    saveData(parsed);
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Reset all data to bundled default portfolio.json and clear auth
 */
export function resetToDefaults() {
  memoryData = deepClone(defaultPortfolioData);
  memoryUpdateCount = 24;

  if (isBrowser) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(ACTIVITY_LOG_KEY);
      localStorage.setItem(UPDATES_KEY, '24');
    } catch (err) {
      console.error('Error resetting localStorage:', err);
    }
  }

  notifySubscribers();
  return memoryData;
}

/**
 * Subscribe to reactive data updates
 * Returns an unsubscribe callback
 */
export function subscribe(callback) {
  if (!isBrowser || typeof callback !== 'function') {
    return () => {};
  }

  const handler = (event) => {
    callback(event.detail || getData());
  };

  window.addEventListener(EVENT_NAME, handler);

  // Cross-tab synchronization via storage event
  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        memoryData = parsed;
        callback(parsed);
      } catch (err) {
        console.error('Storage sync error:', err);
      }
    } else if (e.key === AUTH_KEY || e.key === UPDATES_KEY || e.key === ACTIVITY_LOG_KEY) {
      callback(getData());
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// Export default object containing all methods for ergonomic access
export default {
  getData,
  saveData,
  notifySubscribers,
  slugify,
  calculateReadTime,
  getProfileAvatar,
  updateProfileAvatar,
  getCVDocumentHtml,
  updateCVDocumentHtml,
  getCVData,
  updateCVData,
  saveCVData,
  getAchievements,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getBlogs,
  getBlogBySlug,
  addBlog,
  updateBlog,
  deleteBlog,
  getCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  logActivity,
  getActivityLog,
  getActivityHeatmapData,
  checkAdminAuth,
  loginAdmin,
  logoutAdmin,
  updateAdminPasskey,
  exportDataJSON,
  importDataJSON,
  resetToDefaults,
  subscribe,
  getUpdateCount,
  incrementUpdateCount,
  getDashboardStats
};

if (typeof window !== 'undefined') {
  window.PortfolioStore = {
    getData,
    saveData,
    notifySubscribers,
    slugify,
    calculateReadTime,
    getProfileAvatar,
    updateProfileAvatar,
    getCVDocumentHtml,
    updateCVDocumentHtml,
    getCVData,
    updateCVData,
    saveCVData,
    getAchievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    getBlogs,
    getBlogBySlug,
    addBlog,
    updateBlog,
    deleteBlog,
    getCourses,
    getCourseById,
    addCourse,
    updateCourse,
    deleteCourse,
    logActivity,
    getActivityLog,
    getActivityHeatmapData,
    checkAdminAuth,
    loginAdmin,
    logoutAdmin,
    updateAdminPasskey,
    exportDataJSON,
    importDataJSON,
    resetToDefaults,
    subscribe,
    getUpdateCount,
    incrementUpdateCount,
    getDashboardStats
  };
  window.store = window.PortfolioStore;
}
