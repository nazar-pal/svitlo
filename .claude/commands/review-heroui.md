Please perform a comprehensive review of how Hero UI Native is used across the application.

Goals:
- Ensure all Hero UI Native components follow library best practices.
- Prefer default styles and behaviors; introduce custom styling only when necessary.
- Treat Hero UI Native's default design as the baseline and avoid unnecessary overrides.

Scope:
- All components that use Hero UI Native.
- Hero UI Native setup and configuration.
- Color definition and usage across the application.

Expectations:
- Validate that the setup aligns with official Hero UI Native documentation.
- Cross-check implementation patterns with examples from the Hero UI GitHub repository:
  https://github.com/heroui-inc/heroui-native/tree/rc/example
- Adopt proven composition patterns from these examples where they improve consistency and UI quality.

Color guidelines:
- Do not hardcode colors inside components.
- Prefer the Hero UI Native default color palette.
- When accessing themed colors outside components that support `className`, use appropriate Hero UI Native or Uniwind hooks.
- If a required color is missing:
  - Check for an existing suitable color in the Hero UI theme.
  - Otherwise, use a Tailwind CSS color if appropriate.
  - If still not suitable, define a custom color in global CSS.
- Make decisions case-by-case with a focus on consistency, maintainability, and visual coherence.

Refactoring:
- Identify custom components that can be replaced with Hero UI Native equivalents.
- Refactor where it improves consistency, maintainability, or design quality.

Outcome:
- Consistent, maintainable UI built primarily on Hero UI Native with minimal customization.
- Centralized, well-structured color system with no unnecessary duplication or hardcoded values.
