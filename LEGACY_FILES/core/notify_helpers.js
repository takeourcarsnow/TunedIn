// Notification integration for likes and comments
import notifications from '../core/notifications.js';

// Only show notification if the current user is the post author
import { state } from './app_state.js'; // We'll create this to export the app state

export function notifyPostLike(post, liker) {
  if (!post || !liker || !state.user) return;
  if (post.userId !== state.user.id) return; // Only notify if current user is the author
  if (post.userId === liker.id) return; // Don't notify self
  notifications.add(`Your post "${post.title}" received a like!`, 'info');
}

export function notifyPostComment(post, commenter) {
  if (!post || !commenter || !state.user) return;
  if (post.userId !== state.user.id) return; // Only notify if current user is the author
  if (post.userId === commenter.id) return; // Don't notify self
  notifications.add(`Your post "${post.title}" received a new comment!`, 'info');
}
