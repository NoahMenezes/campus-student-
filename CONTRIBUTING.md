# Contributing to campus-student

Thank you for considering a contribution to **campus-student**! This is an Expo
SDK 58 / React Native 0.88 mobile application using Expo Router for
file-based navigation. We welcome bug reports, feature requests, and pull
requests.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [License](#license)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you agree to uphold this code. Please report unacceptable
conduct to the project maintainers.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/) (`npx expo --version`)

### Installation

```bash
git clone https://github.com/NoahMenezes/campus-student-.git
cd campus-student
npm install
```

### Running the Development Server

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS (macOS only)
npx expo start --ios

# Run on web
npx expo start --web
```

### Environment Configuration

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

Never commit real secrets to version control.

## Development Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes.

3. Run lint and typecheck:
   ```bash
   npx expo lint
   npx tsc --noEmit
   ```

4. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: describe your change"
   ```

5. Push to your branch and open a pull request.

## Project Structure

```
campus-student/
├── src/
│   ├── app/              # Expo Router file-based routes
│   │   ├── index.tsx     # Home screen
│   │   ├── explore.tsx   # Explore screen
│   │   └── _layout.tsx   # Root tab layout
│   ├── components/       # Reusable UI components
│   │   ├── themed-view.tsx
│   │   ├── themed-text.tsx
│   │   ├── hint-row.tsx
│   │   ├── collapsible.tsx
│   │   ├── animated-icon.tsx
│   │   ├── animated-icon.web.tsx
│   │   ├── app-tabs.tsx
│   │   ├── app-tabs.web.tsx
│   │   ├── external-link.tsx
│   │   └── web-badge.tsx
│   ├── constants/        # Theme constants
│   │   └── theme.ts
│   ├── hooks/            # Custom React hooks
│   │   ├── use-theme.ts
│   │   ├── use-color-scheme.ts
│   │   └── use-color-scheme.web.ts
│   └── global.css        # Web font variables
├── assets/               # Images, icons, splash screen
├── scripts/              # Utility scripts (reset-project)
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── eslint.config.js      # ESLint configuration
```

### Key Directories

| Directory | Responsibility |
|-----------|---------------|
| `src/app/` | Expo Router screens and layout (file-based routing) |
| `src/components/` | Reusable UI components (themed, animated, etc.) |
| `src/constants/` | App-wide constants (theme colors, spacing, fonts) |
| `src/hooks/` | Custom hooks (color scheme, theme) |
| `assets/` | Static images, icons, splash screen assets |

## Coding Standards

- **TypeScript**: All source files must be TypeScript (`strict` mode enabled).
- **ESLint**: Follow the Expo ESLint config (`eslint-config-expo`).
- **Components**: Use `ThemedView` and `ThemedText` for consistent theming.
- **Platform-specific files**: Use `.web.tsx` and `.native.tsx` extensions for
  platform-specific implementations.
- **No comments**: Do not add comments unless explaining non-obvious logic.
- **Formatting**: 2-space indentation, LF line endings, UTF-8 encoding.

## Submitting a Pull Request

1. Fork the repository and create your branch from `main`.
2. Ensure `npx expo lint` and `npx tsc --noEmit` both pass.
3. Update tests if applicable (none currently configured).
4. Open a pull request against `main`.
5. Provide a clear description of the change and why it's needed.
6. Link any related issues.

Pull requests are reviewed by maintainers. Be prepared to address review
comments before merging.

## License

This project is licensed under the [MIT License](LICENSE).