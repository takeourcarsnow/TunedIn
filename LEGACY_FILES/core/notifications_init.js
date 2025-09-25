import notificationsView from '../views/notifications_view.js';
import notifications from './notifications.js';
import { state } from './app_state.js';
import DB from './db.js';

function getUserPostActivityKey(userId) {
  return `tunedin_post_activity_${userId}`;
}

function getStoredActivity(userId) {
  try {
    return JSON.parse(localStorage.getItem(getUserPostActivityKey(userId)) || '{}');
  } catch {
    return {};
  }
}

function setStoredActivity(userId, data) {
  localStorage.setItem(getUserPostActivityKey(userId), JSON.stringify(data));
}

async function checkForNewPostActivity() {
  if (!state.user) return;
  if (DB.refresh) await DB.refresh();
  const db = DB.getAll();
  const myPosts = db.posts.filter(p => p.userId === state.user.id);
  const stored = getStoredActivity(state.user.id);
  let changed = false;
  myPosts.forEach(post => {
    const prev = stored[post.id] || { likes: 0, comments: 0 };
    if ((post.likes?.length || 0) > prev.likes) {
      notifications.add(`Your post "${post.title}" received a new like!`, 'info');
      changed = true;
    }
    if ((post.comments?.length || 0) > prev.comments) {
      notifications.add(`Your post "${post.title}" received a new comment!`, 'info');
      changed = true;
    }
    stored[post.id] = {
      likes: post.likes?.length || 0,
      comments: post.comments?.length || 0
    };
  });
  if (changed) setStoredActivity(state.user.id, stored);
}

// Initialize notifications UI and show a test notification on DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {
  notificationsView.init();
  // Remove test notification
  // notifications.add('Test notification: If you see this, notifications are working!', 'info', 5000);
  setTimeout(() => {
    checkForNewPostActivity();
    setInterval(checkForNewPostActivity, 10000);
  }, 1000);
});
