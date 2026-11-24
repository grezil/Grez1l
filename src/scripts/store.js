/**
 * Space Portfolio Client-Side Reactive Store & Data Engine
 * 
 * Manages reactive state via localStorage with SSR fallback to src/data/portfolio.json.
 * Dispatches 'portfolio-data-updated' CustomEvent on all mutations.
 */
import defaultPortfolioData from '../data/portfolio.json' with { type: 'json' };

const STORAGE_KEY = 'space_portfolio_data_v1';
const AUTH_KEY = 'space_portfolio_admin_auth';
const UPDATES_KEY = 'space_portfolio_update_count';
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
 * { blogsCount, achievementsCount, updatesCount }
 */
export function getDashboardStats() {
  const current = getData();
  const blogsCount = (current.blogs || []).length;
  const achievementsCount = (current.achievements || []).length;
  const updatesCount = getUpdateCount();
  return {
    blogsCount,
    achievementsCount,
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
    const achCount = (newData.achievements || []).length;

    newData.profile.telemetryStats = newData.profile.telemetryStats.map(stat => {
      const labelLower = (stat.label || '').toLowerCase();
      const key = stat.key || '';
      if (key === 'blogs' || labelLower.includes('blog')) {
        return { ...stat, value: String(blogsCount) };
      }
      if (key === 'achievements' || labelLower.includes('honor') || labelLower.includes('award')) {
        return { ...stat, value: String(achCount) };
      }
      if (key === 'updates' || labelLower.includes('update') || labelLower.includes('revision')) {
        return { ...stat, value: String(updatedRevision) };
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
 * Helper to slugify strings for blog URLs
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
  return getCVData();
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
  const dateStr = blog.date || now.toISOString().split('T')[0];

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
// 4. ADMIN AUTHENTICATION METHODS
// ==========================================

/**
 * Check if the user is currently logged in as Admin
 */
export function checkAdminAuth() {
  if (!isBrowser) return false;
  try {
    return localStorage.getItem(AUTH_KEY) === 'true';
  } catch (err) {
    return false;
  }
}

/**
 * Attempt Admin login with password / passkey
 * Default passkey: 'apollo11'
 */
export function loginAdmin(password) {
  const current = getData();
  const configuredPasskey = current.admin?.passkey || current.admin?.defaultPasskey || 'apollo11';

  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  if (password.trim() === configuredPasskey.trim()) {
    if (isBrowser) {
      try {
        localStorage.setItem(AUTH_KEY, 'true');
      } catch (err) {
        console.error('Error saving admin auth session:', err);
      }
    }
    notifySubscribers();
    return { success: true };
  } else {
    return { success: false, error: 'Invalid security passkey. Mission access denied.' };
  }
}

/**
 * Logout of Admin mode
 */
export function logoutAdmin() {
  if (isBrowser) {
    try {
      localStorage.removeItem(AUTH_KEY);
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
// 5. BACKUP, IMPORT, EXPORT & RESET
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
    } else if (e.key === AUTH_KEY || e.key === UPDATES_KEY) {
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
  getAchievements,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getBlogs,
  getBlogBySlug,
  addBlog,
  updateBlog,
  deleteBlog,
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
    getAchievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    getBlogs,
    getBlogBySlug,
    addBlog,
    updateBlog,
    deleteBlog,
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
