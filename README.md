# THE SYSTEM (Bio-Sync OS Engine)

Welcome to **THE SYSTEM**, a gamified productivity and fitness application inspired by "Solo Leveling". This application serves as a "Player Menu" for real life, tracking your workouts, habits, and long-term vision.

## Features

- **Gamified Dashboard**: Track XP, Level, Gold, and Stats (Strength, Intelligence, etc.).
- **Quest System**: Create and complete daily tasks. Auto-ranking system classifies quests by difficulty and category.
- **Reward Shop**: Spend earned Gold on real-life rewards.
- **Awakening Board**: Visual dual-column interface for defining your "Vision" vs. "Anti-Vision".
- **Penalty Zone**: Logic enforcing consistency; missing daily quests triggers a penalty state.
- **Cinematic Level Ups**: Full-screen feedback when you gain enough XP.
- **Shadow Mode**: Hidden aesthetic changes when reaching Level 10.

## Tech Stack

- **React 18**
- **TypeScript**
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **Recharts** (Stat Radar)

## How to Run Locally

This project was built to be compatible with a standard Node.js environment or CodeSandbox/StackBlitz.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
    *Ensure you have `react`, `react-dom`, `framer-motion`, `lucide-react`, `recharts` installed.*

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    *Or `npm start` depending on your `package.json` scripts.*

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Usage Tips

- **XP Farming**: Click on the "Workouts" card in the dashboard to gain 50 XP (Demo Mode) to test leveling up.
- **Penalties**: If you miss a daily quest (reset logic based on local storage date), you enter the Penalty Zone.
- **Data Persistence**: All data is saved to your browser's `localStorage`.

## System Status

> "The System is watching your progress. Do not falter."

***
*Developed by Bio-Sync OS Engine*
