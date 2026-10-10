<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep CMM domain types, demo seed and pure transitions in `src/lib/cmm`; financial invariants must not depend on UI timing.
- Access demonstration state through the repository interface and React provider; a future remote adapter must replace persistence without rewriting pages.
- Demo storage is versioned, validated and hydrated after mount; preserve SSR consistency and never write seeds before hydration.
- Use separate TanStack leaf routes for each operational screen, with shared navigation in the root outlet wrapper.
- Keep all amounts in integer BRL cents and store applied service prices on each booking to prevent catalog changes altering historical charges.
