# Hansardzzz

A sleep-aid web app. Users browse UK parliamentary Hansard records, select a passage, and have it read aloud via the browser's built-in text-to-speech engine. The dry, procedural monotony of parliamentary debate is the feature.

This is a solo project. Prefer simplicity and readability over abstraction.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Type safety on API responses; minimal config overhead with Vite |
| Build tool | Vite | Zero-config dev server, fast HMR, native ESM output |
| UI framework | Vanilla TS (no framework) | Project is small enough; no reactivity library needed |
| Styling | Plain CSS (CSS custom properties) | No preprocessor needed for this scope |
| TTS | Web Speech API (`SpeechSynthesis`) | Built into every modern browser; no backend or API key |
| Data | Hansard API (public, no auth) | Official Parliament API, free read access |
| Hosting | Static (Netlify / GitHub Pages) | No server required; purely client-side app |

No backend. No database. No authentication. Everything runs in the browser.

---

## Project Structure

```
hansardzzz/
  src/
    main.ts              # App entry point — mounts the app into #app
    style.css            # Global styles and CSS custom properties
    api/
      hansard.ts         # All Hansard API calls (typed fetch wrappers)
      types.ts           # TypeScript interfaces for API response shapes
    tts/
      speech.ts          # SpeechSynthesis wrapper (play, pause, stop, rate, voice)
    pages/
      BrowsePage.ts      # Browse by date / section — renders section list
      SearchPage.ts      # Search debates by keyword
      PlayerPage.ts      # Loads a debate, displays contributions, drives TTS
    components/
      DebateCard.ts      # Renders a single debate result item
      ContributionList.ts# Renders the ordered list of contributions in a debate
      TtsControls.ts     # Play/pause/stop buttons, speed slider, voice picker
      DatePicker.ts      # House + date selector for browse flow
    router.ts            # Minimal hash-based router (#/browse, #/search, #/play/:id)
    utils.ts             # Shared helpers (date formatting, text sanitisation)
  public/
    favicon.svg
  index.html             # Single HTML shell — one <div id="app">
  vite.config.ts
  tsconfig.json
  package.json
```

Each file in `pages/` and `components/` exports a single function that returns an `HTMLElement`. No class components, no JSX. Keep functions small and composable.

---

## Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview the production build locally
npm run typecheck    # tsc --noEmit (run before committing)
```

There is no test runner configured initially. Add Vitest if unit tests are needed for the API wrappers or TTS logic.

---

## Hansard API

**Base URL:** `https://hansard-api.parliament.uk`

All endpoints return JSON when the path ends in `.json`. No API key or authentication is required. CORS is open for browser requests.

### Key Endpoints

#### Search contributions (spoken speeches)
```
GET /search/contributions/Spoken.json
```
Query parameters:
- `searchTerm` — keyword filter (optional; omit for browsing without a keyword)
- `house` — `Commons` or `Lords`
- `startDate` / `endDate` — ISO date strings `yyyy-MM-dd`
- `skip` / `take` — pagination (default `take=20`, max ~100)
- `memberId` — filter to a specific MP (integer)

Returns `SearchContributionsResult`:
```ts
interface SearchContributionsResult {
  SearchTerms: string[];
  TotalResultCount: number;
  SpokenResultCount: number;
  Results: ContributionSearchItem[];
}

interface ContributionSearchItem {
  MemberName: string;
  MemberId: number;
  AttributedTo: string;           // e.g. "Steve Barclay (North East Cambridgeshire) (Con)"
  ItemId: number;
  ContributionExtId: string;      // GUID
  ContributionText: string;       // excerpt / truncated
  ContributionTextFull: string;   // full speech text — USE THIS for TTS
  HRSTag: string;                 // e.g. "hs_Para"
  DebateSection: string;          // e.g. "Westminster Hall"
  DebateSectionId: number;
  DebateSectionExtId: string;     // GUID — use to fetch full debate
  SittingDate: string;            // ISO datetime e.g. "2024-03-13T00:00:00"
  Section: string;
  House: string;
  OrderInDebateSection: number;
  Rank: number;
}
```

#### Search debates by keyword
```
GET /search/debates.json
```
Query parameters: `searchTerm`, `house`, `startDate`, `endDate`, `skip`, `take`

Returns:
```ts
interface SearchDebatesResult {
  TotalResultCount: number;
  Results: DebateSearchItem[];
}

interface DebateSearchItem {
  Title: string;
  DebateSection: string;          // e.g. "Westminster Hall", "Commons Chamber"
  House: string;
  SittingDate: string;
  DebateSectionExtId: string;     // GUID — primary key for fetching full debate
  Rank: number;
}
```

#### Fetch a full debate (all contributions)
```
GET /debates/debate/{debateSectionExtId}.json
```
Path parameter: `debateSectionExtId` is a GUID.

Returns a `Debate` object:
```ts
interface Debate {
  Overview: DebateOverview;
  Navigator: NavigatorItem[];
  Items: DebateItem[];            // ordered list of contributions and timestamps
  ChildDebates: Debate[];
}

interface DebateOverview {
  Id: number;
  ExtId: string;
  Title: string;
  HRSTag: string;
  Date: string;
  Location: string;               // e.g. "Westminster Hall"
  House: string;
  NextDebateExtId: string;
  NextDebateTitle: string;
  PreviousDebateExtId: string;
  PreviousDebateTitle: string;
}

// ItemType is either "Contribution" or "Timestamp"
interface DebateItem {
  ItemType: "Contribution" | "Timestamp";
  ItemId: number;
  MemberId: number | null;
  AttributedTo: string;
  Value: string;                  // speech text (Contribution) or time string (Timestamp)
  OrderInSection: number;
  ExternalId: string | null;
  HRSTag: string | null;
  IsReiteration: boolean;
}
```

When building the TTS queue, filter `Items` to `ItemType === "Contribution"` and concatenate `AttributedTo + ". " + Value` for each item.

#### Get sections available for a sitting day
```
GET /overview/sectionsforday.json?date={yyyy-MM-dd}&house={house}
```
Returns a plain string array, e.g. `["Debate","WestHall","WMS","GEN","PBC"]`.
Use these values as the `section` parameter for `sectiontrees`.

#### Get section tree for a sitting day
```
GET /overview/sectiontrees.json?date={yyyy-MM-dd}&house={house}&section={section}
```
Returns an array of `SectionTree` objects — hierarchical navigation of debates for that day.

#### Get calendar (available sitting months)
```
GET /overview/calendar.json?year={year}&month={month}&house={house}
```
Returns sitting dates for the given month. Use to populate the date picker and avoid requesting data for non-sitting days.

#### Get last sitting date
```
GET /overview/lastsittingdate.json?house={house}
```
Returns a plain string date. Use this as the default date when the app loads.

### Error Handling

- API returns HTTP 404 for invalid GUIDs or dates with no sitting.
- API returns HTTP 500 occasionally (treat the same as 404 — show "not available").
- Always wrap API calls in try/catch and surface a user-friendly fallback.
- Do not retry on error; show a message and let the user try again.

### Rate Limits

No documented rate limits. This is a low-traffic personal app — no caching layer is needed initially. If repeated browsing causes slow responses, add a simple in-memory cache (`Map<string, unknown>`) keyed on the request URL.

---

## Web Speech API (TTS)

The app uses the browser's built-in `SpeechSynthesis` API. No external TTS service or API key is required.

### Core Usage Pattern

```ts
// src/tts/speech.ts

export interface TtsOptions {
  rate: number;    // 0.1 – 10, default 0.85 (slightly slower than normal for sleep effect)
  pitch: number;   // 0 – 2, default 1.0
  voice: SpeechSynthesisVoice | null;
}

// Speak a single utterance
export function speak(text: string, options: TtsOptions): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel(); // stop anything currently speaking
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate;
  utterance.pitch = options.pitch;
  if (options.voice) utterance.voice = options.voice;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function pause(): void {
  window.speechSynthesis.pause();
}

export function resume(): void {
  window.speechSynthesis.resume();
}

export function stop(): void {
  window.speechSynthesis.cancel();
}

// Load available voices — must be called after the 'voiceschanged' event
export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}
```

### Voice Loading

Voices load asynchronously. The `voiceschanged` event fires when they are ready. Always gate the voice picker on this event:

```ts
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        resolve(window.speechSynthesis.getVoices());
      }, { once: true });
    }
  });
}
```

### Queueing Contributions

For reading an entire debate sequentially, chain utterances using the `onend` callback rather than queuing multiple `speak()` calls (browser implementations of the speech queue are unreliable):

```ts
function speakSequence(texts: string[], options: TtsOptions, index = 0): void {
  if (index >= texts.length) return;
  const utterance = new SpeechSynthesisUtterance(texts[index]);
  utterance.rate = options.rate;
  utterance.pitch = options.pitch;
  if (options.voice) utterance.voice = options.voice;
  utterance.onend = () => speakSequence(texts, options, index + 1);
  window.speechSynthesis.speak(utterance);
}
```

### Known Browser Quirks

- **Chrome/Chromium:** `speechSynthesis.speak()` silently stops if the tab is backgrounded for more than ~30 seconds. Work around this with a periodic `window.speechSynthesis.resume()` call on a short interval while playing (the "Chrome TTS bug" workaround).
- **Safari:** Works well; voices are available synchronously.
- **Firefox:** Voices are available asynchronously; `voiceschanged` fires reliably.
- **Mobile browsers:** User gesture is required before the first `speak()` call. The play button satisfies this — do not auto-play on page load.
- Text passed to `SpeechSynthesisUtterance` should be plain text. Strip any HTML tags from `Value` fields before passing to TTS.

---

## Routing

Use a minimal hash router. No routing library needed.

```
#/             → redirect to #/browse
#/browse       → BrowsePage (date + section picker)
#/search       → SearchPage (keyword search)
#/play/:extId  → PlayerPage (loads debate by GUID, renders TTS player)
```

Implement the router in `src/router.ts` as a simple `window.addEventListener('hashchange', ...)` plus an initial check on `window.location.hash`.

---

## UI Pages

### BrowsePage
- On load, fetch the last sitting date via `/overview/lastsittingdate.json`.
- Show a date input defaulting to that date plus a House selector (Commons / Lords).
- On date change, fetch `/overview/sectionsforday.json` and show a section selector.
- On section selection, fetch `/overview/sectiontrees.json` and render a list of debate titles as links.
- Each debate title links to `#/play/{debateSectionExtId}`.

### SearchPage
- A text input with a Submit button.
- On submit, call `/search/debates.json` with `searchTerm`.
- Render results as `DebateCard` components.
- Include simple pagination (Previous / Next) using `skip` and `take`.
- Show the total result count.

### PlayerPage
- Extract the GUID from the hash (`#/play/:extId`).
- Fetch `/debates/debate/{extId}.json`.
- Display: debate title, date, house, location.
- Filter `Items` to `ItemType === "Contribution"` and render them as a scrollable `ContributionList`.
- Render `TtsControls` at the bottom of the page (sticky).
- On "Play All", build a text sequence from all contributions and call `speakSequence`.
- Highlight the currently-speaking contribution by tracking the `onstart`/`onend` callbacks per utterance.

### TtsControls Component
- Play / Pause / Stop buttons.
- Speed slider: range 0.5–2.0, step 0.05, default 0.85.
- Voice selector: `<select>` populated from `loadVoices()`.
- "Read selected only" toggle: if a single contribution is clicked/selected, only read that one.

---

## Coding Conventions

### TypeScript

- `strict: true` in `tsconfig.json`. No `any` — use `unknown` and narrow.
- All API response shapes must have a corresponding interface in `src/api/types.ts`.
- Use `const` by default; `let` only when reassignment is needed.
- Prefer `async/await` over raw `.then()` chains.
- Export only what is needed from each module (named exports, no default exports except in `main.ts`).

### DOM Manipulation

- Components return `HTMLElement` — they do not directly mutate global state.
- Use `element.replaceChildren(...newChildren)` to update a container rather than `innerHTML = ""` followed by `appendChild`.
- Avoid `innerHTML` with API-sourced data. Build elements programmatically or sanitise with `DOMPurify` if HTML rendering is ever needed.

### CSS

- Use CSS custom properties in `:root` for all colours, spacing, and font sizes.
- Mobile-first. The app is likely used in bed on a phone.
- Aim for a calm, dark-by-default palette. Bright UI elements defeat the purpose.
- Keep font size at least `16px` for body text; controls should be thumb-friendly (min 44px tap target).

### Naming

- Files: `camelCase.ts` for modules, `PascalCase.ts` for components/pages.
- Types/interfaces: `PascalCase`.
- Functions and variables: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` only for true compile-time constants (e.g. `BASE_URL`).
- Avoid abbreviations except for well-known domain terms (`tts`, `extId`, `hs`).

### Git

- Commit messages: imperative mood, present tense. Example: `add speech rate slider to TtsControls`.
- No branch strategy needed for a solo project — commit directly to `main`.
- Do not commit `dist/`, `node_modules/`, or `.env` files.

---

## Environment

No `.env` file is needed — there are no secrets. The Hansard API is public.

If a `.env` is added in future (e.g. for analytics), use Vite's built-in env handling: prefix variables with `VITE_` and access via `import.meta.env.VITE_*`.

---

## Vite Config

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',   // relative paths for static hosting compatibility
  build: {
    target: 'es2020',
  },
});
```

---

## Known Gotchas

- The Hansard API base URL is `hansard-api.parliament.uk`, NOT `hansard.api.parliament.uk`. The latter does not exist.
- `SittingDate` fields come back as ISO datetime strings with a time component (always `T00:00:00`). Use `.split('T')[0]` to get the date string.
- The `Items` array in a `Debate` object mixes `"Contribution"` and `"Timestamp"` items. Always filter by `ItemType`.
- `ContributionTextFull` (on contribution search results) contains the full speech; `ContributionText` is a truncated excerpt. Always use `ContributionTextFull` for TTS input.
- `AttributedTo` values include constituency and party in parentheses, e.g. `"Steve Barclay (North East Cambridgeshire) (Con)"`. Strip the parenthetical suffixes before passing to TTS so the voice does not read them aloud: `attributedTo.replace(/\s*\(.*?\)/g, '').trim()`.
- Some debates have no contributions (procedural stubs). Check `Items.filter(i => i.ItemType === "Contribution").length > 0` before rendering the player.
- The Chrome TTS background-tab bug (see TTS section above) will affect users who lock their phone while the app is playing. Implement the periodic `resume()` workaround from the start.
