# Requirements Document

## Introduction

The Quests view in `DailyCommandCenter` exposes two category tabs: `DEFAULT` (recurring system quests where `isDaily === true` and no `goalId`) and `CUSTOM` (everything else: one-time quests where `isDaily === false`, or any goal-generated quest with a `goalId`). When a user creates a quest while viewing the `DEFAULT` tab — either through the manual quest creation modal (one-time custom quest) or through goal-based quest generation — the new quest is added to the `CUSTOM` tab and is therefore not visible in the user's current view, creating the impression that the quest was not created.

This feature automatically switches the active category tab to `CUSTOM` after a quest creation flow completes successfully, when the resulting quest(s) would land in the `CUSTOM` tab and the user is currently viewing the `DEFAULT` tab. The switch happens only when at least one quest is actually added to the `CUSTOM` category, and it leaves the user's tab choice untouched in every other case.

## Glossary

- **DailyCommandCenter**: The React component (`components/DailyCommandCenter.tsx`) that renders the Quests page, including the Default/Custom category tabs and the quest creation modal.
- **CategoryTab**: The active value of the `todayCategoryTab` state inside `DailyCommandCenter`, with possible values `DEFAULT` and `CUSTOM`.
- **Default_Tab**: The category tab whose value is `DEFAULT`. Lists today's quests where `isDaily === true` and `goalId` is absent.
- **Custom_Tab**: The category tab whose value is `CUSTOM`. Lists today's quests where `goalId` is present OR `isDaily === false`.
- **Custom_Quest**: A `Quest` object that satisfies the Custom_Tab filter — i.e., `!!quest.goalId || quest.isDaily === false`.
- **Manual_Quest_Modal**: The quest creation modal inside `DailyCommandCenter` that lets the user enter a title, run ForgeGuard analysis, set a schedule time, and submit via the create button (`handleCreate`).
- **Goal_Quest_Generation**: The asynchronous flow initiated by `startQuestGeneration` (in `components/GoalDetailView.tsx`) that produces zero or more `Quest` objects with a `goalId` and pushes them to the feed via the `onQuestGenStoreUpdate` listener in `App.tsx` (which calls `addQuest` for each `pendingFeedQuests` entry).
- **Tab_Switch**: A state update that sets `todayCategoryTab` from `DEFAULT` to `CUSTOM`.
- **Tutorial_Mode**: The state where `tutorialStep === 4` or `isQuestOnboarding === true`, in which the Manual_Quest_Modal stays open after submission instead of closing.

## Requirements

### Requirement 1: Auto-switch on manual one-time quest creation

**User Story:** As a user creating a one-time quest from the Default tab, I want the app to switch me to the Custom tab when I submit the quest creation modal, so that I see the new quest immediately without having to find and tap the Custom tab myself.

#### Acceptance Criteria

1. WHEN the Manual_Quest_Modal create handler invokes `addQuest` and the resulting Quest is a Custom_Quest and the CategoryTab is `DEFAULT` and Tutorial_Mode is not active, THE DailyCommandCenter SHALL set the CategoryTab to `CUSTOM` in the same synchronous handler invocation, before initiating the Manual_Quest_Modal close transition, such that the CategoryTab state update is committed prior to the modal close state update.
2. WHEN the Manual_Quest_Modal create handler invokes `addQuest` and the resulting Quest is not a Custom_Quest (i.e., `goalId` is absent AND `isDaily === true`), THE DailyCommandCenter SHALL leave the CategoryTab unchanged.
3. WHEN the Manual_Quest_Modal create handler invokes `addQuest` and the CategoryTab is already `CUSTOM`, THE DailyCommandCenter SHALL leave the CategoryTab unchanged.
4. IF the Manual_Quest_Modal submission is rejected before `addQuest` is called due to any of the following conditions: (a) required field validation failure (empty or whitespace-only title, or title length outside the allowed range), (b) missing or invalid schedule time when scheduling is required, (c) duplicate title matching an existing active Quest for the same user, (d) insufficient gold balance to cover the mandatory pledge amount for the selected pledge rank, or (e) the user has reached the maximum daily quest creation limit, THEN THE DailyCommandCenter SHALL leave the CategoryTab unchanged.
5. WHILE Tutorial_Mode is active, WHEN the Manual_Quest_Modal create handler invokes `addQuest`, THE DailyCommandCenter SHALL leave the CategoryTab unchanged regardless of the resulting Quest's Custom_Quest status.

### Requirement 2: Auto-switch on goal-based quest generation

**User Story:** As a user generating quests from one of my goals while viewing the Default tab, I want the app to switch me to the Custom tab when generation finishes, so that I can see the freshly generated goal quests instantly.

#### Acceptance Criteria

1. WHEN Goal_Quest_Generation transitions to the `DONE` state with a `pendingFeedQuests` array of length greater than 0 and the CategoryTab is `DEFAULT`, THE DailyCommandCenter SHALL set the CategoryTab to `CUSTOM` within 500 milliseconds after dispatching every quest in `pendingFeedQuests` to `addQuest`.
2. IF Goal_Quest_Generation transitions to the `DONE` state and `pendingFeedQuests` has length 0, THEN THE DailyCommandCenter SHALL leave the CategoryTab unchanged and SHALL NOT invoke `addQuest`.
3. IF Goal_Quest_Generation transitions to the `ERROR` state, THEN THE DailyCommandCenter SHALL leave the CategoryTab unchanged and SHALL NOT invoke `addQuest` for any item in `pendingFeedQuests`.
4. WHEN Goal_Quest_Generation transitions to the `DONE` state with a `pendingFeedQuests` array of length greater than 0 and the CategoryTab is already `CUSTOM`, THE DailyCommandCenter SHALL leave the CategoryTab unchanged while still dispatching every quest in `pendingFeedQuests` to `addQuest` in array order.
5. WHEN Goal_Quest_Generation transitions to the `DONE` state with a `pendingFeedQuests` array of length greater than 0 and the CategoryTab is `DEFAULT`, THE DailyCommandCenter SHALL dispatch every quest in `pendingFeedQuests` to `addQuest` in array order before setting the CategoryTab to `CUSTOM`, such that the Custom_Tab renders all dispatched quests on the next render cycle.
6. WHEN Goal_Quest_Generation transitions to the `DONE` state, THE DailyCommandCenter SHALL dispatch each quest in `pendingFeedQuests` to `addQuest` exactly once per `DONE` transition, such that subsequent re-renders or state reads do not re-dispatch the same quests.

### Requirement 3: Preserve user tab choice in all other flows

**User Story:** As a user who has manually selected a tab, I want my tab choice to be preserved unless I have just created a Custom_Quest, so that the app does not surprise me by changing what I am looking at.

#### Acceptance Criteria

1. WHEN a quest list update originates from a server-driven refresh, a schedule slot creation, a dungeon entry, a quest completion, a quest deletion, a quest edit, a tab badge recount, an app foreground refresh, or any source other than a Manual_Quest_Modal submission or a Goal_Quest_Generation completion, THE DailyCommandCenter SHALL leave the current CategoryTab value unchanged and SHALL NOT invoke a Tab_Switch as a consequence of that update.
2. WHEN the user manually taps the `DEFAULT` tab, THE DailyCommandCenter SHALL set the CategoryTab to `DEFAULT` within 200 ms of the tap event.
3. WHILE CategoryTab equals the value last set by a manual user tap, THE DailyCommandCenter SHALL retain that CategoryTab value for every subsequent quest list update that is not a Manual_Quest_Modal submission or a Goal_Quest_Generation completion.
4. WHEN a code path outside this feature assigns a new value to `todayCategoryTab` (for example, a future feature setting `todayCategoryTab` directly), THE DailyCommandCenter SHALL apply that assigned value as the active CategoryTab and SHALL NOT override it via the auto-switch logic.
5. IF the auto-switch logic would otherwise change CategoryTab in response to an update that is neither a Manual_Quest_Modal submission nor a Goal_Quest_Generation completion, THEN THE DailyCommandCenter SHALL suppress that change and retain the existing CategoryTab value.

### Requirement 4: Single-cycle Tab_Switch

**User Story:** As a user creating multiple Custom_Quests in succession, I want the tab to switch to Custom once per creation event without flicker or repeated switches, so that the interface feels responsive and predictable.

#### Acceptance Criteria

1. WHEN a single Manual_Quest_Modal submission produces exactly one Custom_Quest and the CategoryTab is not already `CUSTOM`, THE DailyCommandCenter SHALL perform exactly one Tab_Switch to `CUSTOM` within 500 milliseconds of the submission completion.
2. WHEN a single Goal_Quest_Generation completion produces N Custom_Quests where N is an integer in the inclusive range 1 to 50 and the CategoryTab is not already `CUSTOM`, THE DailyCommandCenter SHALL perform exactly one Tab_Switch to `CUSTOM` for the entire batch within 500 milliseconds of the batch completion.
3. WHILE the CategoryTab equals `CUSTOM`, THE DailyCommandCenter SHALL suppress all Tab_Switch invocations triggered by subsequent Manual_Quest_Modal submissions or Goal_Quest_Generation completions, such that zero Tab_Switch operations occur.
4. IF a Manual_Quest_Modal submission or Goal_Quest_Generation completion produces zero Custom_Quests, THEN THE DailyCommandCenter SHALL not perform a Tab_Switch and SHALL preserve the current CategoryTab value unchanged.
