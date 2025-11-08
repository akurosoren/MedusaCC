# Jellyfin Control Center

Jellyfin Control Center (JCC) is a web application designed to give you enhanced control over your self-hosted media ecosystem. It integrates directly with Jellyfin, Radarr, and Sonarr to provide a centralized dashboard and powerful automation tools for managing your library.

The main goal is to help you intelligently manage your storage space by automatically deleting old content you no longer watch, while giving you full control over what is kept.

## 🚀 Features

*   **Dynamic Dashboard:** Get an at-a-glance view of your services' connection status (Jellyfin, Radarr, Sonarr) and discover the latest movies and episodes added to your library.
*   **Cleanup Automation:** Set up custom retention rules. For example, automatically delete movies after 7 days or TV show seasons after 28 days. The application identifies eligible media and lets you delete them with a single click.
*   **Exclusion Management:** Protect your favorite movies and series! Any item added to the exclusion list will be ignored by the automation process, ensuring it is never deleted.
*   **Full Control:** Before each deletion, you can review the list of items, deselect those you wish to keep temporarily, or add them to your permanent exclusion list.
*   **Secure & Local Interface:** The application is protected by a password you set on first use. All your connection information and settings are stored **only locally** in your browser's storage, ensuring your privacy.

---

## 🛠️ Installation and Configuration

The application is designed to be simple to deploy. Once deployed, follow these steps to configure it:

### 1. First Launch

When you first open the application, it will ask you to create a password. This password secures access to your settings and will be stored locally in your browser.

### 2. Service Configuration

Go to the **Settings** tab (gear icon).

*   **Jellyfin (Required):**
    1.  **Server URL:** Enter the full address of your Jellyfin server (e.g., `http://192.168.1.10:8096`).
    2.  **API Key:** Generate an API key in your Jellyfin admin dashboard (`Dashboard > Advanced > API Keys`) and paste it here.
    3.  **Load Users:** Click this button. If the information is correct, a dropdown list will appear.
    4.  **User to Use:** Select the Jellyfin account whose library you want to scan.
*   **Radarr & Sonarr (Optional but Recommended):**
    - These services are necessary for the automation to be able to **delete files**. If you don't configure them, the scan will work, but deletion will fail.
    - Enter the URL and API key for each service you use. You can find the API key in the `Settings > General` section of Radarr/Sonarr.
    - Use the "Test Connection" button to verify that the information is correct.
*   **Automation:**
    - Define the number of retention days for movies and TV show seasons. This duration determines if a media item is considered "old".

Don't forget to click **"Save Settings"**!

---

## 📖 User Guide

### Dashboard

This is your homepage. It gives you a quick overview of your services' status and the latest additions to your media library, allowing you to see if everything is running correctly.

### Automation

This is the core of the application.

1.  **Run a Scan:** Click the "Scan Jellyfin Library" button. The application will query your Jellyfin server to find all movies and seasons that exceed the retention period you've set and are not on your exclusion list.
2.  **Review the Results:** The found items are displayed as cards. By default, they are all selected for deletion.
3.  **Adjust the Selection:**
    *   Click on a card to **deselect** it. It will not be deleted this time but may reappear in a future scan.
    *   Hover over a card and click the **shield icon** to add the item to your permanent exclusion list.
4.  **Delete:** Once you are satisfied with your selection, click the "Delete from Radarr/Sonarr" button. You will be asked for confirmation. After confirming, the application will contact Radarr/Sonarr to delete the corresponding files from your disk.
5.  **Check the Logs:** The right-hand column displays a real-time log of operations, informing you of successes and failures.

### Exclusions

This page displays all the movies and series you have marked as excluded. They are protected and will never appear in the automation scan results. You can remove an item from this list at any time by clicking the "Remove" button that appears on hover.
