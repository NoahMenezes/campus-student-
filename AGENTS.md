This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Error-Solving Guide (read this before fixing errors)

### Web hydration mismatch (ThemedView/ThemedText colors flip on web)
**Symptom:** Console error "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties." Server renders light theme (`rgb(255,255,255)`, `rgb(0,0,0)`), client renders dark theme (`rgba(0,0,0,1)`, `rgba(255,255,255,1)`), or vice versa.
**Root cause:** `use-color-scheme.web.ts` returns a different value during SSR vs after client hydration when the user's system color scheme is dark.
**Fix:** `src/hooks/use-color-scheme.web.ts` must return `'light'` before hydration (to match SSR) and the real scheme after hydration. Use a `useState`/`useEffect` hydration guard with a targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` comment on the `setHasHydrated(true)` line. Do NOT simply return `useRNColorScheme() ?? 'light'` — that causes the mismatch.
**Verification:** `npx tsc --noEmit` and `npx expo lint` must both exit 0.

### General error workflow
1. Read the full error + component stack (not just the last line).
2. Identify server-vs-client divergence (SSR hydration, `typeof window`, `Date.now()`, `Math.random()`).
3. Fix the source, not the symptom.
4. Run `npx tsc --noEmit` and `npx expo lint` to confirm.
5. Commit the fix with a clear message.
