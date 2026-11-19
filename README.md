# campus-student

An Expo SDK 58 / React Native 0.88 mobile application built with Expo Router
(file-based routing). Provides a Welcome screen and Explore screen with themed
UI components, light/dark mode support, and cross-platform navigation.

## Features

- **Expo Router** — File-based routing with typed routes
- **Light/Dark mode** — System theme detection with hydration-safe web rendering
- **Cross-platform** — iOS, Android, and web support from a single codebase
- **Animated components** — Reanimated-powered splash overlay and collapsible sections
- **Themed UI** — Consistent theming via `ThemedView` and `ThemedText` components

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 58 |
| Runtime | React Native 0.88.1, React 19 |
| Navigation | Expo Router (~58) |
| Language | TypeScript (strict) |
| Styling | React Native StyleSheet + global CSS |
| Animation | react-native-reanimated, react-native-worklets |
| Images | expo-image, expo-symbols |
| Linting | ESLint (eslint-config-expo) |

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm

### Installation

```bash
git clone https://github.com/NoahMenezes/campus-student-.git
cd campus-student
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

Never commit real secrets to version control.

### Running the App

```bash
# Start the Expo development server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS (macOS only)
npx expo start --ios

# Run on web
npx expo start --web
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start on Android |
| `npm run ios` | Start on iOS (macOS only) |
| `npm run web` | Start on web |
| `npm run lint` | Run ESLint |
| `npm run reset-project` | Reset to blank starter template |

## Project Structure

```
campus-student/
├── src/
│   ├── app/              # Expo Router file-based routes
│   │   ├── index.tsx     # Home screen
│   │   ├── explore.tsx   # Explore screen
│   │   └── _layout.tsx   # Root tab layout
│   ├── components/       # Reusable UI components
│   ├── constants/        # Theme constants
│   ├── hooks/            # Custom React hooks
│   └── global.css        # Web font variables
├── assets/               # Images, icons, splash screen
├── scripts/              # Utility scripts
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── eslint.config.js      # ESLint configuration
```

## Contributing

We welcome contributions! Please see our
[Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md)
for details.

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `npx expo lint` and `npx tsc --noEmit`
5. Open a pull request

## Security

For security vulnerabilities, please see our
[Security Policy](SECURITY.md) and use GitHub's private vulnerability reporting
feature. Do not open public issues for security concerns.

## License

This project is licensed under the [MIT License](LICENSE).

> **Note:** The LICENSE file currently uses a placeholder for the copyright
> holder. Please update it with the correct copyright holder before publishing.