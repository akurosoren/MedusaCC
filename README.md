# Medusa

Medusa is an elegant, modern web application designed to give you enhanced control over your self-hosted media ecosystem. It seamlessly integrates **Jellyfin**, **Radarr**, and **Sonarr** into a unified interface, providing deep insights into your viewing habits and powerful automation tools to manage your storage.

## ✨ Key Features

### 📊 Personal Stats Hub
Dive into your viewing history with a beautiful, data-rich interface.
*   **Activity Insights:** See your total watch time, favorite genres, and most active days.
*   **Letterboxd Integration:** Import your Letterboxd data (ZIP) to merge your external history with Jellyfin. Visualize your rating distribution, discover your favorite film decades, and see your oldest watched movies.
*   **Recap 2025:** A "Spotify Wrapped" style summary of your year in entertainment.

### 🤖 Smart Automation & Cleanup
Manage your storage space intelligently without losing control.
*   **Retention Rules:** Define how long to keep content (e.g., "Delete movies older than 30 days", "Delete episodes after 14 days").
*   **Safe Deletion:** The app identifies eligible media but *never* deletes without your confirmation. You can review items, exclude specific titles, or delete them in bulk.
*   **Radarr/Sonarr Sync:** Deletions are triggered via Radarr and Sonarr APIs to ensure files are removed cleanly from your disk and database.
*   **Webhooks:** Get notified via Discord when an automation run frees up space.

### ⚡ Admin Dashboard
A centralized control center for your server.
*   **Service Status:** Real-time health checks and ping monitoring for Jellyfin, Radarr, and Sonarr.
*   **Live Activity:** Monitor active playback sessions.
*   **Download Queues:** View real-time download progress from Radarr and Sonarr directly in the dashboard.

### 🔒 Privacy & Security
*   **Local First:** Medusa is a client-side application. Your API keys, URLs, and settings are stored **locally in your browser**. Nothing is sent to a third-party server.
*   **Role-Based Access:** 
    *   **Admins:** Full access to automation, server settings, and deletion tools.
    *   **Users:** Read-only access to their personal stats and library views.

---

## 🛠️ Configuration Guide

### 1. Connection Setup
Navigate to the **Settings** page (Gear icon).
*   **Jellyfin:** Enter your server URL. You can log in with your credentials or provide an API Key manually for admin features.
*   **Radarr / Sonarr (Optional):** Required for automation features. Enter your URL and API Key (found in `Settings > General` of the respective apps).

### 2. Letterboxd Import (Optional)
To unlock detailed statistics and graphs:
1.  Export your data from Letterboxd (Settings > Import & Export > Export Data).
2.  In Medusa Settings, scroll to **Data Management**.
3.  Click **Import Letterboxd (ZIP)** and select your downloaded zip file.
4.  Medusa will parse your `diary.csv`, `watched.csv`, and `ratings.csv` to enrich your stats hub.

### 3. Automation
1.  Go to the **Automation** tab.
2.  Set your retention limits (e.g., Movie Retention: 90 days).
3.  Click **Scan**.
4.  Review the candidates. Click the **Shield** icon on any item you want to protect forever (Exclusions).
5.  Click **Delete** to clean up the selected items.

---

## 🎨 Technology Stack
*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS (Glassmorphism design system)
*   **Icons:** Heroicons
*   **State:** React Context + LocalStorage