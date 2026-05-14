# Next.js: Server & Client Components Rendering

1. **DEFAULT TO SERVER**: All components must be Server Components by default. Keep them that way to maximize SSR benefits and minimize bundle size.
2. **USE CLIENT SPARINGLY**: Only declare `"use client"` at the top of a file when the component explicitly requires:
   - React state or lifecycle hooks (`useState`, `useEffect`).
   - Browser APIs (`window`, `localStorage`).
   - Event listeners (`onClick`, `onChange`, `onSubmit`).
3. **ATOMIC CLIENTS**: Keep Client Components as small leaf nodes in the component tree. Do not make entire pages or large layout blocks Client Components.
4. **COMPOSITION PATTERN (SERVER INSIDE CLIENT)**: NEVER import a Server Component directly into a Client Component. If a Client Component needs to render a Server Component, pass the Server Component via the `children` prop (or as a ReactNode prop) to the Client Component so it can be hydrated correctly.
5. **ASYNC ACTIONS IN CONTAINERS**: Client Containers must execute server-side logic by calling asynchronous Server Actions (e.g., inside an `onSubmit` handler using `await`). Do not query the database directly from any client-side hook.