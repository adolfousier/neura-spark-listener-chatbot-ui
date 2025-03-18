# Contributing to Neura AI Chatbot UI

Thank you for your interest in contributing to Neura AI! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

We expect all contributors to follow our Code of Conduct. Please be respectful and considerate of others when contributing to the project.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- Git

### Setting Up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/neura-ai.git
   cd neura-ai
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/neura-ai.git
   ```
4. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
5. Create a `.env` file based on `.env.example` and add your API keys

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes, following our [coding standards](#coding-standards)

3. Run the development server to test your changes:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Commit your changes with a descriptive commit message:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

5. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request from your fork to the main repository

## Pull Request Process

1. Ensure your code follows our coding standards and passes all tests
2. Update the README.md with details of changes if applicable
3. The PR should work in all supported browsers and devices
4. Your PR will be reviewed by maintainers, who may request changes
5. Once approved, your PR will be merged

## Coding Standards

### General Guidelines

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Write self-documenting code with appropriate comments

### TypeScript/JavaScript Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` before submitting your code
- Fix any linting errors before submitting a PR

### React Best Practices

- Use functional components with hooks
- Keep components small and focused on a single responsibility
- Use the Context API for state that needs to be shared across components
- Avoid prop drilling by using context or composition

### CSS/Styling

- We use Tailwind CSS for styling
- Follow the existing design system and component patterns
- Use the provided UI components from our component library

## Testing

We encourage writing tests for new features. While we don't currently have a formal testing setup, we plan to add one in the future.

## Documentation

- Update documentation when you change functionality
- Document new components with JSDoc comments
- Add comments to explain complex logic

## Adding New Features

When adding new features, consider the following:

1. Is this feature aligned with the project's goals?
2. Does it follow our design principles?
3. Is it well-tested and documented?
4. Does it maintain backward compatibility?

## License

By contributing to Neura AI, you agree that your contributions will be licensed under the project's MIT license.

## Questions?

If you have any questions or need help, please open an issue or reach out to the maintainers.

Thank you for contributing to Neura AI!