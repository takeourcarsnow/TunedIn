// Console suppression toggle: set to true to allow console output.
// For local debugging, you can set window.__TUNEDIN_ENABLE_CONSOLE = true before app code runs.
export const ENABLE_CONSOLE = false;
if (typeof window !== 'undefined' && !ENABLE_CONSOLE && !window.__TUNEDIN_ENABLE_CONSOLE) {
	try {
		const _noop = function() {};
		// Keep original stored in case extensions rely on them (not exposed here)
		console.log = _noop;
		console.info = _noop;
		console.warn = _noop;
		console.error = _noop;
		console.debug = _noop;
		console.trace = _noop;
		console.group = _noop;
		console.groupCollapsed = _noop;
		console.groupEnd = _noop;
	} catch (e) {
		// ignore failures (some hosts may lock console)
	}
}

// Header update message (shown below ASCII frame)
export const UPDATE_HEADER_MESSAGE = '> updates: thumbnails / mobile / lyrics';
// Guest mode header messages (cycled in header)
export const GUEST_HEADER_MESSAGES = [
	'Welcome, anon! Eavesdrop on the feed.',
	'Ready to drop a track? Smash the login!',
	'Sign up to join the party & post your pick.',
	'Browse the vibes. Want in? Create an account.',
	'Guest mode: listen, lurk, discover.',
	'Your turn to post? Log in and join us!',
	'No account? No post. But you can still jam!',
	'Feed’s open. Posting? That’s members only.',
	'Want to share a song? Register & join in!',
	'Liking the tunes? Make an account & post!'
];

// Shared string constants
// Post limit / cooldown wait messages (shared by header and compose box)
export const POST_LIMIT_MESSAGES = [
	'Hang tight—your daily post is recharging.',
	'Almost there! New post window opens soon.',
	'Rate limit on. Discover new tracks!',
	'Patience, DJ! You can post again soon.',
	'Enjoy the feed while you wait.',
	'You’re recharging—back with a tune soon.'
];

// Ready-to-post messages (header only, not currently used in compose box)
export const POST_READY_MESSAGES = [
	"Time’s up! Drop your freshest tune.",
	"The stage is yours—share your music!",
	"Ready to post? Let’s hear what you’ve got!",
	"Mic’s on. What are you listening to today?",
	"It’s posting time - bring the vibes!",
	"Your post window is open. Make it count!",
	"Go on, share your soundtrack for today.",
	"Let’s see what’s spinning in your world!",
	"You’re up! What’s your tune of the day?",
	"Spotlight’s on you—post your music pick!"
];

// Fun messages to show when user is NOT in cooldown (can post)
export const POST_NO_COOLDOWN_MESSAGES = [
	"Drop your daily banger—make us jealous!",
	"What’s your soundtrack for today?",
	"Song living rent-free in your head?",
	"One post, infinite vibes. Pick your song!",
	"Got a tune that slaps? Share it!",
	"Today’s pick: someone’s new obsession!",
	"Ready to bless the feed? Drop it now!",
	"Share a song, spark a vibe. You’re up!",
	"One shot, one song. Make it count!"
];
export const PROMPT_STUCK = '> so what song has been stuck in your head lately?';
export const PROMPT_SHARE = '> share a track that made your day better!';
export const PROMPT_LOOPING = '> what have you been looping non-stop?';
export const PROMPT_HIDDEN_GEM = '> found a hidden gem? drop it here!';
export const PROMPT_TUNE = '> what tune do you want everyone to hear right now?';
export const PROMPT_MOOD = '> got a song that matches your mood? share it!';
export const PROMPT_MEMORY = '> post a track that brings back memories.';
export const PROMPT_DISCOVER = '> help us discover something new today!';
export const PROMPT_VIBE = '> what track sets the vibe for you right now?';
export const PROMPT_REPEAT = '> which song do you keep coming back to?';
export const PROMPT_SOUNDTRACK = '> what would be the soundtrack to your day?';
export const PROMPT_FIRST = '> what was the first song you loved?';
export const PROMPT_LAST = '> what was the last song you added to your playlist?';
export const PROMPT_MORNING = '> what song gets you going in the morning?';
export const PROMPT_NIGHT = '> what do you listen to late at night?';
export const PROMPT_FAVORITE_LYRICS = '> share a song with your favorite lyrics!';
export const PROMPT_UNDERRATED = '> what’s the most underrated track you know?';
export const PROMPT_DANCE = '> which song makes you want to dance?';
export const PROMPT_CHILL = '> what’s your go-to chillout song?';
export const PROMPT_INSPIRE = '> which song inspires you the most?';
export const PROMPT_TRAVEL = '> what’s your favorite song for traveling?';
export const PROMPT_FRIEND = '> what song would you recommend to a friend?';
export const PROMPTS = [
	PROMPT_STUCK,
	PROMPT_SHARE,
	PROMPT_LOOPING,
	PROMPT_HIDDEN_GEM,
	PROMPT_TUNE,
	PROMPT_MOOD,
	PROMPT_MEMORY,
	PROMPT_DISCOVER,
	PROMPT_VIBE,
	PROMPT_REPEAT,
	PROMPT_SOUNDTRACK,
	PROMPT_FIRST,
	PROMPT_LAST,
	PROMPT_MORNING,
	PROMPT_NIGHT
	,PROMPT_FAVORITE_LYRICS
	,PROMPT_UNDERRATED
	,PROMPT_DANCE
	,PROMPT_CHILL
	,PROMPT_INSPIRE
	,PROMPT_TRAVEL
	,PROMPT_FRIEND
];
