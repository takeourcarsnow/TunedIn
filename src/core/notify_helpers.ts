import notifications from './notifications';
import { state } from '../core/app_state';

export function notifyPostLike(post: any, liker: any): void {
  if (!post || !liker || !state.user) return;
  if (post.userId !== state.user.id) return;
  if (post.userId === liker.id) return;
  notifications.add(`Your post "${post.title}" received a like!`, 'info');
}

export function notifyPostComment(post: any, commenter: any): void {
  if (!post || !commenter || !state.user) return;
  if (post.userId !== state.user.id) return;
  if (post.userId === commenter.id) return;
  notifications.add(`Your post "${post.title}" received a new comment!`, 'info');
}
