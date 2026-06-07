# Implementation Plan: Auto-Switch Quest Tab

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Each prompt builds on the previous prompts, and ends with wiring things together. There is no hanging or orphaned code that isn't integrated into a previous step. Focus is ONLY on tasks that involve writing, modifying, or testing code.

The implementation lands in two surgical edits to `components/DailyCommandCenter.tsx`:
1. Three pure decision helpers at module scope (`isCustomQuest`, `shouldSwitchOnManualCreate`, `shouldSwitchOnGoalGenDone`) for testability.
2. A one-line `setTodayCategoryTab('CUSTOM')` call inside `handleCreate` (manual modal trigger) plus a new `useEffect` that subscribes to the existing `onQuestGenStoreUpdate` emitter (goal-gen trigger).

Three correctness properties are validated with `fast-check` (numRuns: 100, the library default). React wiring is validated with React Testing Library example-based tests.

## Tasks

- [x] 1. Set up testing infrastructure
  - [x] 1.1 Install testing dependencies
    - Add devDependencies to `package.json`: `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `fast-check`
    - Add scripts: `"test": "vitest --run"`, `"test:watch": "vitest"`
    - Run `npm install`
    - _Requirements: All (test runtime prerequisite)_

  - [x] 1.2 Add vitest configuration and test setup
    - Create `vitest.config.ts` with `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./test/setup.ts']`
    - Create `test/setup.ts` that imports `'@testing-library/jest-dom'`
    - Confirm `tsconfig.json` includes the test files
    - _Requirements: All (test runtime prerequisite)_

- [x] 2. Add pure decision helpers to DailyCommandCenter
  - [x] 2.1 Define module-scope decision functions in `components/DailyCommandCenter.tsx`
    - Add `isCustomQuest(q: Quest): boolean` returning `!!q.goalId || q.isDaily === false`
    - Add `shouldSwitchOnManualCreate({ newQuest, currentTab, isTutorial })` per design
    - Add `shouldSwitchOnGoalGenDone({ storeState, pendingFeedQuestsCount, currentTab })` per design
    - Export the three helpers as named exports so test files can import them without rendering the component
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.2 Write property test for `shouldSwitchOnManualCreate`
    - **Property 1: Manual-create switch decision is correct iff Custom_Quest on DEFAULT outside tutorial**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 4.1, 4.3, 4.4**
    - File: `components/__tests__/DailyCommandCenter.decisions.manualCreate.property.test.ts`
    - Generators: `fc.record({ goalId: fc.option(fc.string(), { nil: undefined }), isDaily: fc.boolean(), id: fc.string(), title: fc.string() })`, `fc.constantFrom('DEFAULT', 'CUSTOM')`, `fc.boolean()`
    - Assertion: `shouldSwitchOnManualCreate(...) === (currentTab === 'DEFAULT' && !isTutorial && (!!q.goalId || q.isDaily === false))`
    - Use `fast-check`'s default `numRuns: 100`; do not lower it

  - [ ]* 2.3 Write property test for `shouldSwitchOnGoalGenDone`
    - **Property 2: Goal-gen switch decision is correct iff DONE-with-results on DEFAULT**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 4.2, 4.3, 4.4**
    - File: `components/__tests__/DailyCommandCenter.decisions.goalGen.property.test.ts`
    - Generators: `fc.constantFrom('IDLE', 'GENERATING', 'DONE', 'ERROR')`, `fc.integer({ min: 0, max: 50 })`, `fc.constantFrom('DEFAULT', 'CUSTOM')`
    - Assertion: `shouldSwitchOnGoalGenDone(...) === (storeState === 'DONE' && pendingFeedQuestsCount > 0 && currentTab === 'DEFAULT')`
    - Use `fast-check`'s default `numRuns: 100`

- [x] 3. Wire manual quest creation auto-switch
  - [x] 3.1 Edit `handleCreate` in `components/DailyCommandCenter.tsx`
    - In the non-tutorial branch, after `addQuest(newQuest)` and BEFORE `setIsModalOpen(false)`, call `setTodayCategoryTab('CUSTOM')` guarded by `shouldSwitchOnManualCreate({ newQuest, currentTab: todayCategoryTab, isTutorial: false })`
    - Do NOT modify the tutorial branch (`tutorialStep === 4 || isQuestOnboarding`)
    - Do NOT modify any of the existing early-return validation guards at the top of `handleCreate`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.3, 4.4_

  - [ ]* 3.2 Write RTL tests for manual-create tab behavior
    - File: `components/__tests__/DailyCommandCenter.manualCreate.test.tsx`
    - Mount `DailyCommandCenter` with `todayCategoryTab` initial value `'DEFAULT'`; submit modal with a non-daily title; assert the rendered active tab becomes `'CUSTOM'` and the modal closes (Req 1.1)
    - Mount with `todayCategoryTab='DEFAULT'`; submit modal where the resulting Quest is a daily, non-goal quest; assert tab stays `'DEFAULT'` (Req 1.2, 4.4)
    - Mount with `todayCategoryTab='CUSTOM'`; submit modal with Custom_Quest; assert tab stays `'CUSTOM'` and the addQuest spy fires once (Req 1.3, 4.3)
    - Mount with `tutorialStep === 4` and `isQuestOnboarding === true` and `todayCategoryTab='DEFAULT'`; submit modal; assert tab stays `'DEFAULT'` AND modal stays open (Req 1.5)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.3, 4.4_

  - [ ]* 3.3 Write RTL tests for `handleCreate` validation rejection paths
    - File: `components/__tests__/DailyCommandCenter.manualCreate.validation.test.tsx`
    - One test per rejection cause from Req 1.4: (a) empty/whitespace title, (a') title length out of range, (b) missing/invalid schedule time when required, (c) duplicate active title, (d) insufficient gold for pledge, (e) daily creation cap reached
    - For each test: spy on `setTodayCategoryTab` (or assert tab DOM unchanged) and on `addQuest`; assert NEITHER fires; assert tab value unchanged from its initial `'DEFAULT'`
    - _Requirements: 1.4_

- [x] 4. Wire goal-gen completion auto-switch
  - [x] 4.1 Add `useEffect` subscriber in `components/DailyCommandCenter.tsx`
    - Place after the existing state hooks block; subscribes via `onQuestGenStoreUpdate(...)` and returns its `unsub`
    - Filter early on `store.state !== 'DONE'`
    - Use `lastHandledDoneRef = useRef<{ goalId: string | null; ts: number } | null>(null)` to suppress double-fire within a 50ms window keyed on `goalId`, satisfying Req 2.6 under React StrictMode
    - Do NOT call `addQuest` here — `App.tsx`'s existing listener remains the sole dispatcher
    - Call `setTodayCategoryTab('CUSTOM')` only when `shouldSwitchOnGoalGenDone(...)` returns `true`
    - Add `todayCategoryTab` to the effect's dependency array
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write property test for listener fan-out ordering
    - **Property 3: Listener fan-out preserves dispatch-then-switch ordering**
    - **Validates: Requirements 2.5, 2.6**
    - File: `components/__tests__/DailyCommandCenter.listenerOrdering.property.test.ts`
    - Stand up a fake emitter mirroring `_questGenListeners` semantics (a `Set` plus `updateStore`) and register two listeners: a fake `App.tsx` listener that pushes `'addQuest:i'` for each `pendingFeedQuests[i]`, then a fake `DailyCommandCenter` listener that pushes `'switch'`
    - Generator: `fc.integer({ min: 1, max: 50 })` for batch size N
    - Fire one `'DONE'` snapshot with `pendingFeedQuests` of length N
    - Assert call log equals `['addQuest:0', ..., 'addQuest:N-1', 'switch']` AND each index appears exactly once
    - Use `fast-check`'s default `numRuns: 100`

  - [ ]* 4.3 Write RTL tests for goal-gen completion behavior
    - File: `components/__tests__/DailyCommandCenter.goalGen.test.tsx`
    - Stub `onQuestGenStoreUpdate` to capture the registered callback; mount `DailyCommandCenter` with `todayCategoryTab='DEFAULT'`; fire `{state:'DONE', pendingFeedQuests:[q1,q2,q3]}`; assert `setTodayCategoryTab('CUSTOM')` is observed AFTER all three `addQuest` calls when both listeners are wired (Req 2.1, 2.5)
    - Same setup but `pendingFeedQuests:[]`; assert NO `addQuest`, tab unchanged (Req 2.2, 4.4)
    - Fire `{state:'ERROR'}`; assert NO `addQuest`, tab unchanged (Req 2.3)
    - Mount with `todayCategoryTab='CUSTOM'`; fire DONE with N=3; assert all 3 `addQuest` fire in order, tab stays `'CUSTOM'` (Req 2.4, 4.3)
    - Fire DONE twice in rapid succession (within 50ms) for the same `goalId`; assert tab switch fires exactly once (Req 2.6, 4.2)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.2, 4.3, 4.4_

- [x] 5. Checkpoint - auto-switch logic in place
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Tab preservation regression coverage
  - [ ]* 6.1 Write RTL tests for non-creation update paths
    - File: `components/__tests__/DailyCommandCenter.preservation.test.tsx`
    - For each of: server-driven quests refresh, schedule slot creation, dungeon entry, quest completion, quest deletion, quest edit, tab badge recount, app foreground refresh — drive the corresponding state update without firing the manual modal or the goal-gen DONE; assert `todayCategoryTab` is unchanged
    - Add a test that simulates external assignment of `todayCategoryTab` (e.g., via the existing tap handler at `'DEFAULT'`); fire a non-creation quest update; assert the externally-assigned value is preserved (Req 3.4)
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write RTL test for the `DEFAULT` tab manual tap regression
    - File: `components/__tests__/DailyCommandCenter.tabTap.test.tsx`
    - Mount with `todayCategoryTab='CUSTOM'`; user-event click the `DEFAULT` tab; assert `todayCategoryTab` becomes `'DEFAULT'` within 200ms (use `waitFor`)
    - _Requirements: 3.2_

- [x] 7. Final checkpoint - full suite passes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All edits to `components/DailyCommandCenter.tsx` are sequenced (2.1 → 3.1 → 4.1) because they touch the same file
- Property tests use `fast-check` with the default `numRuns: 100`; do not reduce
- `App.tsx` and `components/GoalDetailView.tsx` are NOT modified — the design relies on the existing listener-registration order (App first, DailyCommandCenter second) in `_questGenListeners`
- The Capacitor mobile manual smoke test described in the design (create a non-daily quest from `DEFAULT`, confirm visual switch on device) is intentionally NOT a coding task and is excluded from this plan; perform it manually after the suite passes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["6.1", "6.2"] }
  ]
}
```
