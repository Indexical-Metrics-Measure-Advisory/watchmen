# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d9455efe-9563-429f-ad18-5d921030c949

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d9455efe-9563-429f-ad18-5d921030c949) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Style guide and UI consistency

This app uses Tailwind tokens defined in `src/index.css` and extended via `tailwind.config.ts`.

- Color tokens: `--primary`, `--secondary`, `--background`, `--foreground`, etc.
- Radius: `--radius` with default `rounded-lg` applied by shadcn `Card`.
- Typography: default Tailwind font stack; use `text-sm`, `text-2xl`, `font-semibold` consistently.

New reusable components for dashboard consistency:

- `src/components/ui/metric-card.tsx` — unified metric tile (label + value + icon) using variant styles.
- `src/components/ui/action-tile.tsx` — accessible action link tile for quick actions.
- `src/lib/variants.ts` — centralized color system for variants: `module`, `model`, `table`, `monitor`, `info`.

Index page (`src/pages/Index.tsx`) is refactored to use these components, aligning spacing, colors, and radius with surrounding pages.

## Visual regression testing

Basic Playwright visual tests are included:

- Config: `playwright.config.ts` (reuses existing dev server at `http://localhost:8080/`).
- Test: `tests/visual/index.spec.ts` — captures a baseline screenshot of the dashboard container.

Run tests and create baseline snapshots:

```sh
npm run test:visual -- --update-snapshots
```

Subsequent runs without `--update-snapshots` will compare against the baseline to detect style regressions.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d9455efe-9563-429f-ad18-5d921030c949) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
