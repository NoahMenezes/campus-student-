# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of **campus-student** seriously. If you discover a
security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Do not open a public GitHub issue for security vulnerabilities. Public
disclosure can put users at risk before a fix is available.

### 2. Contact the Maintainer

Report the vulnerability directly to the repository owner via GitHub's private
vulnerability reporting feature (click the "Security" tab, then "Report a
vulnerability") or email the maintainer directly.

### 3. What to Include

Please include as much of the following as possible:

- A description of the vulnerability and its impact
- Steps to reproduce the issue
- Affected versions and environments
- Proof of concept or screenshots (if applicable)
- Suggested remediation (if you have one)

### 4. What to Expect

- Your report will be acknowledged within 5 business days.
- You will receive regular updates on the investigation and remediation.
- You will be credited in the release notes (unless you prefer to remain
  anonymous).

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials to the repository.
- Use `.env.example` as a template; never commit real `.env` files.
- All dependencies are pinned to specific versions in `package-lock.json`.
- Run `npm audit` regularly to check for vulnerable dependencies.
- Use `expo-secure-store` for sensitive data on-device, never AsyncStorage.

## Disclosure Policy

We follow coordinated disclosure best practices. We will not disclose a
vulnerability publicly until a fix has been released and users have had
reasonable time to update.