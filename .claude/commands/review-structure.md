Review the overall project structure and file organization of the codebase. Look for inconsistencies, misplaced files, and areas where the structure could be improved to make the codebase clearer and easier to maintain.

Focus on identifying opportunities to:
- Rename files, folders, functions, or components when the current names do not clearly describe their purpose.
- Reorganize files or folders if related logic is currently scattered or placed in unintuitive locations.
- Standardize patterns when the same kind of functionality is implemented or organized in different ways across the project.

Refactoring is allowed when it improves clarity, but avoid unnecessary changes.

Large files or functions may be decomposed if they are excessively large or difficult to understand. However, large components are not automatically a problem—only suggest splitting them if it meaningfully improves readability or maintainability.

It is acceptable for a file to contain multiple smaller components if they are only used by the main component in that file. Moving them into separate files is optional and should be evaluated case by case.

Look for places where the code violates the DRY (Don't Repeat Yourself) principle. If similar logic appears in multiple places, identify opportunities to extract reusable utilities, hooks, helpers, or shared components. Reuse and deduplication are strongly encouraged when they improve clarity and maintainability.

Also look for cases where related logic should likely be grouped together but is currently separated, or where existing conventions are inconsistent and could be unified across the codebase.

Prioritize changes that improve clarity, consistency, reuse, and long‑term maintainability rather than purely stylistic refactors.
