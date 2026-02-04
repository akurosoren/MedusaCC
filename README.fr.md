# Medusa

Medusa est une application web élégante et moderne conçue pour vous offrir un contrôle total sur votre écosystème multimédia auto-hébergé. Elle intègre **Jellyfin**, **Radarr** et **Sonarr** dans une interface unifiée, offrant des statistiques détaillées sur vos habitudes de visionnage et des outils d'automatisation puissants pour gérer votre stockage.

## ✨ Fonctionnalités Clés

### 📊 Mes Stats (Personal Hub)
Plongez dans votre historique de visionnage avec une interface riche en données.
*   **Analyses d'activité :** Visualisez votre temps total de visionnage, vos genres préférés et vos jours les plus actifs.
*   **Intégration Letterboxd :** Importez vos données Letterboxd (ZIP) pour fusionner votre historique externe avec Jellyfin. Visualisez la distribution de vos notes, découvrez vos décennies de cinéma préférées et retrouvez le film le plus ancien que vous ayez vu.
*   **Recap 2025 :** Un résumé annuel de votre année cinéma/séries, style "Spotify Wrapped".

### 🤖 Automatisation & Nettoyage
Gérez votre espace de stockage intelligemment sans perdre le contrôle.
*   **Règles de Rétention :** Définissez combien de temps conserver le contenu (ex: "Supprimer les films vus il y a plus de 30 jours").
*   **Suppression Sécurisée :** L'application identifie les médias éligibles mais ne supprime *jamais* rien sans votre confirmation. Vous pouvez revoir les éléments, en exclure certains, ou supprimer en masse.
*   **Sync Radarr/Sonarr :** Les suppressions passent par les API de Radarr et Sonarr pour garantir que les fichiers sont proprement effacés du disque et de la base de données.
*   **Webhooks :** Recevez une notification Discord lorsqu'un nettoyage libère de l'espace.

### ⚡ Tableau de Bord Admin
Un centre de contrôle centralisé pour votre serveur.
*   **État des Services :** Vérification en temps réel (ping) de Jellyfin, Radarr et Sonarr.
*   **Activité en Direct :** Surveillez les sessions de lecture actives.
*   **Files d'attente :** Suivez la progression des téléchargements Radarr et Sonarr directement depuis le dashboard.

### 🔒 Confidentialité & Sécurité
*   **Local First :** Medusa est une application côté client. Vos clés API, URL et paramètres sont stockés **localement dans votre navigateur**. Rien n'est envoyé à un serveur tiers.
*   **Accès par Rôle :** 
    *   **Admins :** Accès complet à l'automatisation, aux réglages serveurs et aux outils de suppression.
    *   **Utilisateurs :** Accès en lecture seule à leurs statistiques personnelles et à la bibliothèque.

---

## 🛠️ Guide de Configuration

### 1. Connexion
Allez dans la page **Paramètres** (icône engrenage).
*   **Jellyfin :** Entrez l'URL de votre serveur. Connectez-vous avec vos identifiants ou fournissez une Clé API manuellement pour les fonctions admin.
*   **Radarr / Sonarr (Optionnel) :** Requis pour l'automatisation. Entrez l'URL et la Clé API (trouvables dans `Settings > General` de chaque application).

### 2. Import Letterboxd (Optionnel)
Pour débloquer les graphiques et statistiques avancées :
1.  Exportez vos données depuis le site Letterboxd (Settings > Import & Export > Export Data).
2.  Dans les paramètres de Medusa, descendez à **Gestion des données**.
3.  Cliquez sur **Importer Letterboxd (ZIP)** et sélectionnez le fichier zip téléchargé.
4.  Medusa analysera vos fichiers `diary.csv`, `watched.csv` et `ratings.csv` pour enrichir vos statistiques.

### 3. Automatisation
1.  Allez dans l'onglet **Automation**.
2.  Définissez vos limites de rétention (ex: Films : 90 jours).
3.  Cliquez sur **Analyser**.
4.  Passez en revue les candidats à la suppression. Cliquez sur l'icône **Bouclier** pour protéger définitivement un élément (Exclusions).
5.  Cliquez sur **Supprimer** pour nettoyer les éléments sélectionnés.

---

## 🎨 Stack Technique
*   **Frontend :** React 18, TypeScript, Vite
*   **Style :** Tailwind CSS (Design System Glassmorphism)
*   **Icônes :** Heroicons
*   **État :** React Context + LocalStorage