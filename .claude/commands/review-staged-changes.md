Review all staged changes to ensure they introduce no bugs, performance regressions, or UI/UX issues. Every modification should move the product forward—never degrade it.

Ensure the implementation is consistent with the rest of the codebase. Follow established patterns, folder structure, file organization, and existing approaches so that new code feels native to the project, not custom or out of place.

**Treat official documentation as the absolute source of truth.** This project always uses the latest versions of its dependencies — your training data may be outdated. Before making or validating any decision involving a library, actively fetch and consult its current official documentation. Do not rely on memorized knowledge of APIs, options, or best practices that may have changed. If tooling is available to inspect installed package versions or changelogs, use it.

Actively check for and flag any usage of deprecated APIs, obsolete patterns, legacy behaviors, or approaches that have been superseded in recent releases. Use available tools to assist with this — e.g., checking deprecation warnings, scanning changelogs, or cross-referencing current type definitions.

I'm also open to additional improvements that enhance developer experience — such as better abstractions, improved code readability, reduced boilerplate, smarter defaults, or tooling suggestions — wherever they add clear value without unnecessary complexity.

**I am equally and strongly open to additional UI and UX improvements.** If you spot any opportunity to make the interface more polished, intuitive, accessible, or visually consistent — even if it wasn't part of the original change — flag it or implement it. Don't hold back on UI/UX suggestions out of scope concerns.
