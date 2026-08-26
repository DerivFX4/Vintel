# VintelFX

> VintelFX is a branded visual trading bot platform built on React and the Deriv trading ecosystem. It provides a dashboard, visual bot-building tools, market charts, account connectivity, signal analysis, and configurable trading workflows.

![Node.js](https://img.shields.io/badge/node-22.x%20%7C%2024.x-blue.svg)
![npm](https://img.shields.io/badge/npm-9%2B-blue.svg)
![Build](https://img.shields.io/badge/build-RSBuild-green.svg)
![Framework](https://img.shields.io/badge/framework-React%2018-blue.svg)

---

## Repository

- **Repository:** [DerivFX4/Vintel](https://github.com/DerivFX4/Vintel)
- **Default branch:** `master`
- **Application:** VintelFX
- **Website:** `vintelfx.site`
- **Source control:** GitHub
- **Deployment:** Vercel

This repository contains the VintelFX application source code, static assets, serverless API routes, configuration, testing setup, and project documentation.

> **Important:** VintelFX is a third-party application and is not affiliated with or endorsed by Deriv. Users remain responsible for their own account access, trading decisions, and configuration.

---

## What the Project Contains

### Core application

- **Dashboard** — account information, activity, performance, and trading controls.
- **Bot Builder** — visual Blockly-based strategy creation and bot configuration.
- **Charts** — market and indicator visualisation.
- **Trading integration** — bot runtime and real-time trading communication.
- **Account connectivity** — authentication and authenticated account access.
- **Signal scanning** — server-side Signal AI scanning functionality.
- **Branding system** — central configuration for VintelFX identity and visual settings.

---

## Project Structure

```text
Vintel/
├── .github/                         # GitHub configuration and automation
│   ├── workflows/                   # CI and workflow definitions
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── pull_request_template.md
│
├── .husky/                          # Git hooks
├── __mocks__/                       # Test mocks
│
├── api/                             # Serverless/backend API routes
│   ├── oauth/
│   │   └── token.js                 # OAuth token handling endpoint
│   └── signal-scan.js               # Signal scanning API
│
├── public/                          # Static public files
│   └── assets/
│       └── icons/                   # Application icons
│
├── src/                             # Main application source code
│   ├── app/                         # Application-level logic
│   ├── components/                  # Reusable UI components
│   │   └── layout/                  # Layout components
│   ├── pages/                       # Application pages
│   ├── stores/                      # Application state
│   ├── services/                    # API and application services
│   ├── hooks/                       # React hooks
│   ├── styles/                      # Application styling and themes
│   └── external/
│       ├── bot-skeleton/            # Bot runtime and Blockly integration
│       └── indicators/              # Technical indicators
│
├── user-guide/                      # Project documentation
├── scripts/                         # Build and utility scripts
│
├── brand.config.json                # VintelFX branding/configuration
├── index.html                       # Application HTML entry
├── package.json                     # Dependencies and npm scripts
├── package-lock.json                # Locked dependency versions
├── babel.config.js                  # Babel configuration
├── jest.config.ts                   # Jest configuration
├── jest.setup.ts                    # Jest test setup
├── README.md                        # Repository documentation
├── LICENSE                          # License information
└── configuration files              # ESLint, Prettier, Stylelint, etc.
```

---

## Key Files and Directories

| Location | Purpose |
| --- | --- |
| `src/` | Main VintelFX frontend application |
| `src/app/` | Application-level startup and logic |
| `src/components/` | Reusable interface components |
| `src/pages/` | Main application pages and views |
| `src/stores/` | Application state management |
| `src/services/` | API, platform, and application services |
| `src/hooks/` | Reusable React hooks |
| `src/external/bot-skeleton/` | Trading bot runtime and Blockly functionality |
| `src/external/indicators/` | Technical analysis indicators |
| `api/` | Serverless API functionality |
| `api/oauth/token.js` | OAuth token handling |
| `api/signal-scan.js` | Signal scanning logic |
| `public/` | Static assets served by the application |
| `brand.config.json` | Branding and platform configuration |
| `package.json` | Dependencies and project commands |
| `scripts/` | Utility and build scripts |
| `user-guide/` | Developer and project documentation |

---

## Technology Stack

The repository is built around:

- **React 18** — application UI
- **TypeScript / JavaScript** — application development
- **RSBuild** — development and production builds
- **Blockly** — visual bot-building interface
- **Jest** — testing
- **ESLint / Prettier / Stylelint** — code quality and formatting
- **GitHub** — source control
- **Vercel** — deployment and hosting

The trading and account integration layers communicate with the configured Deriv infrastructure and application APIs.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/DerivFX4/Vintel.git
cd Vintel
```

### 2. Use a supported Node.js version

Node.js **24.x** is recommended. Node.js **22.x** is also supported.

```bash
nvm use
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure the application

Review:

- `brand.config.json`
- environment variables configured in the deployment platform
- OAuth and redirect configuration

### 5. Generate brand CSS if branding changes require it

```bash
npm run generate:brand-css
```

### 6. Start development

```bash
npm start
```

### 7. Create a production build

```bash
npm run build
```

The production output is generated in:

```text
dist/
```

---

## Environment Configuration

Deployment secrets and sensitive configuration should be stored in the hosting platform's environment-variable settings rather than committed to the repository.

The VintelFX deployment may use environment variables for Deriv application configuration, OAuth configuration, and related server-side functionality.

Do not commit private credentials, access tokens, client secrets, or personal account tokens to GitHub.

---

## Deployment

VintelFX is deployed from this GitHub repository through Vercel.

### Standard deployment flow

```text
GitHub commit
      ↓
Repository branch
      ↓
Vercel detects the update
      ↓
Build runs
      ↓
Application deploys
```

The production build output is:

```text
dist/
```

A README-only change does not modify the application source code, API routes, dependencies, or runtime logic. Depending on deployment settings, the commit may trigger a new deployment, but the README itself is documentation only.

### Important deployment areas

Changes in these locations can affect the application:

- `src/`
- `api/`
- `package.json`
- `brand.config.json`
- build configuration
- deployment configuration
- environment variables

Changes to `README.md` are documentation changes.

---

## Authentication and Account Access

The repository includes application support for account authentication and OAuth-related flows.

Relevant areas include:

```text
api/oauth/token.js
src/
brand.config.json
```

OAuth credentials, redirect URLs, application IDs, and scopes must match the values configured with the relevant platform and deployment environment. The OAuth authorization-code exchange should be handled securely by server-side code where required.

Never expose private credentials in client-side source code or commit them to this repository.

---

## Bot and Trading Architecture

The visual bot system is primarily located under:

```text
src/external/bot-skeleton/
```

This area contains the bot runtime and Blockly-related functionality used by the visual bot-building experience.

Technical indicators are maintained separately under:

```text
src/external/indicators/
```

These components are used by the charting and market-analysis functionality where configured.

---

## Signal Analysis

The repository includes a server-side signal scanning route:

```text
api/signal-scan.js
```

This endpoint is responsible for application-side signal scanning functionality and should be maintained together with the corresponding frontend consumers in `src/`.

---

## Testing and Code Quality

The repository includes configuration for testing and code quality tools.

Common checks include:

```bash
npm test
npm run test:lint
npm run build
```

Before significant changes are merged or deployed, the application should be checked for:

- successful dependency installation
- lint errors
- test failures
- successful production build
- deployment errors

---

## Repository Conventions

Recommended commit prefixes:

```text
feat:      new functionality
fix:       bug fix
refactor:  internal code improvement
test:      tests
docs:      documentation
chore:     maintenance
```

Keep unrelated changes separate where possible. For example, a README documentation update should not be mixed with application code changes unless both are intentionally part of the same release.

---

## Configuration Safety

Before changing authentication, WebSocket, API, or deployment configuration, verify the relevant platform requirements and environment variables.

Particular care should be taken with:

- OAuth client configuration
- redirect URLs
- application IDs
- production/staging endpoints
- account tokens
- WebSocket authentication
- environment-variable names

Incorrect values can prevent login, account loading, API access, or trading functionality.

---

## Contributing

1. Create or select the correct branch.
2. Make the required change.
3. Test the affected functionality.
4. Run a production build where appropriate.
5. Commit with a clear conventional commit message.
6. Push the change to GitHub.
7. Confirm the deployment result.

---

## License

See [LICENSE](./LICENSE).
