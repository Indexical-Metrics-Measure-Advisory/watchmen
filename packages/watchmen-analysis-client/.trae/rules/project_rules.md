# Project Rule: ai hypothesis insurance

This project is a React-based user interface application. The following rules should be followed during development to ensure consistency and maintainability.

1. Models
- All business logic models must be placed under the `/model/` folder.


2. Services
- All API calls must be encapsulated in the `/services/` folder.
- Avoid calling APIs directly in components; instead, call service functions.

3. Mock Data
- All mock data must be placed under in service layer 

4. Components
- Reusable components should be stored in `/components/`.
- Page-level components should be stored in `/pages/`.


6. Code Quality
- Use ESLint and Prettier to maintain code quality and formatting.
- Code should pass all lint and type checks before merging.
- Follow a modular structure to improve testability and reuse.


8. Styling
- Use Tailwind CSS or styled-components for styling.
- Avoid global CSS whenever possible.

This rule file ensures that the project maintains a clean architecture with separation of concerns between models, services, UI components, and data mocking.
