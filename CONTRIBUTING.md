# Contributing to StockPilot

First off, thank you for considering contributing to StockPilot! This is a portfolio project intended to demonstrate modern frontend engineering practices, but suggestions and improvements are always welcome.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies: `npm install`
3. Set up your `.env.local` based on `.env.example`.
4. Run the development server: `npm run dev`

## Pull Request Process

1. Create a descriptive branch name (`feature/add-dark-mode` or `fix/table-sorting-bug`).
2. Ensure your code passes all TypeScript and ESLint checks (`npm run typecheck` and `npm run lint`).
3. Maintain the existing code style (border-first design, strict TypeScript).
4. Submit a Pull Request utilizing the provided PR template.

## Code Style

- **TypeScript:** Strict typing is required. Avoid `any`.
- **Components:** Favor functional components and React Hooks. Keep files modular.
- **Styling:** Use Tailwind CSS utility classes. Avoid arbitrary values unless absolutely necessary.
