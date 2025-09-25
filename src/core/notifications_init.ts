import notificationsView from '../views/notifications_view';
import notifications from './notifications';
import { state } from './app_state';
import DB from './db';

function getUserPostActivityKey(userId: string | number) {
  return `tunedin_post_activity_${userId}`;
}

function getStoredActivity(userId: string | number) {
  try {
    return JSON.parse(localStorage.getItem(getUserPostActivityKey(userId)) || '{}');
  } catch { return {}; }
}

function setStoredActivity(userId: string | number, data: any) {
  localStorage.setItem(getUserPostActivityKey(userId), JSON.stringify(data));
}

async function checkForNewPostActivity() {
  const user = state.user;
  if (!user) return;
  if (DB.refresh) await DB.refresh();
  const db = DB.getAll();
  const myPosts = (db.posts || []).filter((p: any) => p.userId === user.id);
  const stored = getStoredActivity(user.id);
  let changed = false;
  myPosts.forEach((post: any) => {
    const prev = stored[post.id] || { likes: 0, comments: 0 };
    if ((post.likes?.length || 0) > prev.likes) {
      notifications.add(`Your post "${post.title}" received a new like!`, 'info');
      changed = true;
    }
    if ((post.comments?.length || 0) > prev.comments) {
      notifications.add(`Your post "${post.title}" received a new comment!`, 'info');
      changed = true;
    }
    stored[post.id] = { likes: post.likes?.length || 0, comments: post.comments?.length || 0 };
  });
  if (changed) setStoredActivity(user.id, stored);
}

// Initialize notifications UI and schedule background checks
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function () {
    notificationsView.init();
    setTimeout(() => {
      checkForNewPostActivity();
      setInterval(checkForNewPostActivity, 10000);
    }, 1000);
  });
}
