import { parseProvider } from './providers.js';
import { uid } from '../core/utils.js';

export async function seedDemo(DB, state, render) {
  // Always ensure demo user exists in DB (handles both local and remote)
  let me = null;
  try {
    me = await DB.ensureUser('demo');
  } catch (e) {
    console.error('Failed to ensure demo user', e);
    throw e;
  }
  if (!state.user) {
  localStorage.setItem('TunedIn.space/session@v1', JSON.stringify({ userId: me.id }));
    state.user = me;
  }

  const samples = [
    {
      title:'Selected Ambient Works 85 - 92', artist:'Aphex Twin',
      url:'https://www.youtube.com/watch?v=Xw5AiRVqfqk',
      tags:['idm','electronic','techno'], body:'Richard D James early work. A must hear.',
    },
    {
      title:'Šlamantys', artist:'Mesijus',
      url:'https://open.spotify.com/track/64rMCuIiJVT49SjLhmrHdW',
      tags:['hiphop','rap','lithuanian'], body:'Lithuanian version of MF Doom.'
    },
    {
      title:'Pints of Guiness Make You Strong', artist:'Against Me!',
      url:'https://againstme.bandcamp.com/track/pints-of-guiness-make-you-strong',
      tags:['punk','folk'], body:'The punk classic!'
    },
    {
      title:'Giant Steps',
      artist:'John Coltrane',
      url:'https://www.youtube.com/watch?v=xy_fxxj1mMY',
      tags:['jazz','bebop'],
      body:'One of the greatest jazz albums of all time.'
    },
    {
      title:'Mania',
      artist:'ChildsMind',
      url:'https://soundcloud.com/childsmindmusic/mania',
      tags:['electronic','techno'], body:'Some fun techno from Soundcloud.'
    }
  ];

  if (DB.isRemote && DB.replaceAll) {
    // Keep only the demo user in remote DB before seeding posts
    const users = [me];
    await DB.replaceAll({ users, posts: [] });
    await DB.refresh();
  } else if (DB.getAll && DB.getAll().posts) {
    DB.getAll().posts.length = 0;
    await DB.refresh();
  }

  let firstId = null;
  for (const [i, s] of samples.entries()) {
    const provider = parseProvider(s.url);
    const post = {
      id: uid('p'),
      userId: me.id,
      title: s.title, artist: s.artist, url: s.url,
      provider, tags: s.tags, body: s.body,
      likes: [], comments: [], createdAt: Date.now()
    };
    if (i === 0) firstId = post.id;
    await DB.createPost(post);
  }
  await DB.refresh();
  render();

  setTimeout(() => {
    const btn = document.querySelector(`#post-${firstId} [data-action="toggle-player"]`);
    if (btn) btn.click();
  }, 600);
}