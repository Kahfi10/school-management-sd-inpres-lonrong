---
name: app-dev
description: >-
  Master-grade application development engineering for mobile, desktop, and cross-platform native/hybrid apps.
  Use this skill when developing React Native, Expo, Flutter, Electron, Tauri, iOS (Swift), Android (Kotlin), or PWA clients,
  implementing local state management (Zustand, Redux Toolkit, Riverpod), offline-first sync (SQLite, WatermelonDB, IndexedDB),
  native device APIs (Camera, Biometrics, GPS, Push Notifications), IPC architecture, and app store deployment.
---

# Cross-Platform & Native Application Engineering Skill

This skill provides comprehensive architectural patterns, code hygiene, and deployment pipelines for building production-ready mobile, desktop, and client-heavy applications across iOS, Android, macOS, Windows, and Linux.

---

## 1. Client Application Architecture (MVVM & Feature-Sliced)

Maintain strict decoupling between platform-specific UI widgets and pure business domain logic:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        APP CLIENT ARCHITECTURE                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Presentation Layer (Views, Screens, Hooks, ViewModels)              │
│    └── Platform UI widgets, navigation routing, animation states      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Domain Layer (Use Cases, Business Rules, State Machines)            │
│    └── Framework-agnostic validation, domain calculations, workflows   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Data & Sync Layer (Repositories, Local Cache, Remote API)           │
│    └── Offline queue, HTTP client, SQLite/WatermelonDB, sync engines   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Platform Device Layer (Native Modules, Hardware Drivers, Storage)   │
│    └── Camera, GPS, Biometrics, Keychain/Keystore, Bluetooth, IPC     │
└────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles:
- **Zero Framework Leaks in Domain Logic**: Keep business calculations pure and testable without requiring mock React Native or Flutter runtimes.
- **Single Source of Truth for State**: Distinguish clearly between:
  1. *Ephemeral UI State* (isModalOpen, scrollOffset): Local component state.
  2. *Shared App State* (authenticatedUser, appTheme): Lightweight global store (Zustand, Riverpod).
  3. *Server Cache State* (studentList, courseDetails): TanStack Query / RTK Query with automatic garbage collection.
  4. *Persistent Offline State* (draftApplications, offlineQueue): SQLite / Key-Value SecureStore.

---

## 2. Cross-Platform Framework Standards

### A. React Native & Expo (Modern Architecture)
- **Engine & Renderer**: Enable Hermes JS Engine and Fabric Renderer for 60fps concurrent UI rendering.
- **Gesture & Physics Animations**: Use `react-native-reanimated` (runs on native UI thread) and `react-native-gesture-handler`. Never animate layout properties (`width`, `height`, `top`) on the JS thread; animate `transform` and `opacity`.
- **Safe Area Insets**: Always wrap view roots with `react-native-safe-area-context` to accommodate notches, dynamic islands, and home indicators.
- **List Performance**: Use `@shopify/flash-list` over legacy `FlatList` for recycling memory in large scrollable lists.

### B. Flutter & Dart
- **State Management**: Standardize on Riverpod (functional, compile-safe dependency injection) or BLoC (event-driven streams).
- **Widget Tree Hygiene**: Extract heavy subtrees into dedicated `const` widgets to prevent unneeded re-evaluations.
- **Platform Channels**: Use MethodChannels and Pigeon for type-safe native Swift/Kotlin interop.

### C. Desktop Applications (Tauri & Electron)
- **Tauri First**: Prioritize Tauri (Rust backend + Web frontend) for minimal binary footprint ($< 15\text{MB}$) and reduced RAM consumption.
- **Electron Security**: If using Electron, enforce `contextIsolation: true`, `nodeIntegration: false`, and use typed `ipcRenderer.invoke` via `preload.js`. Never expose raw `child_process` to the renderer.

---

## 3. Offline-First Architecture & Data Synchronization

Design client applications to be 100% resilient to network loss:

```text
[User Action]
     │
     ▼
[1. Optimistic UI Update] ──> Instant visual confirmation
     │
     ▼
[2. Local DB Commit] ───────> SQLite / WatermelonDB
     │
     ▼
[3. Sync Engine Queue]
     ├── Online  ──> Dispatch to Backend API
     └── Offline ──> Persist in IndexedDB/SQLite queue -> Retry with exponential backoff
```

### Conflict Resolution Strategy:
- **Last-Write-Wins (LWW) with Timestamps**: Best for simple record modifications.
- **Append-Only Event Logs**: For mission-critical transactions (e.g. attendance tracking, exam responses), record atomic events rather than state overwrites.

See [`references/offline_first_and_sync.md`](./references/offline_first_and_sync.md) for complete SQLite migration and queue recipes.

---

## 4. Hardware, Biometrics & OS Integrations

### A. Biometric Authentication Flow
1. Check device hardware capability (`canAuthenticateAsync`).
2. Request authentication prompt with customized message.
3. On success, decrypt cryptographic session token from Hardware Keystore/Keychain.
4. On failure or cancel, gracefully fallback to PIN/password modal.

### B. Secure Token Storage
- **iOS**: Keychain via `expo-secure-store` or `react-native-keychain`.
- **Android**: EncryptedSharedPreferences backed by Android Keystore.
- **Never**: Store sensitive auth JWTs in plain `localStorage` or `AsyncStorage`.

---

## 5. Security & Binary Hardening

- **SSL Pinning**: Pin public key certificates for sensitive banking/education endpoints to prevent MitM attacks.
- **Code Obfuscation**: Enable ProGuard / R8 on Android and Symbol Stripping on iOS.
- **Jailbreak / Root Detection**: Verify device integrity before unlocking sensitive student/financial records.
- **Deep Link Validation**: Validate and sanitize all inbound custom schemes (`myapp://`) and Universal Links (`https://app.school.sch.id/...`).

---

## 6. App Release Engineering & CI/CD

- **Automated Fastlane Pipelines**: Automate screenshots, metadata uploads, testflight builds, and Google Play Internal tracks.
- **Over-The-Air (OTA) Updates**: Use Expo EAS Update or CodePush for non-native JS bundle patches without waiting for App Store review cycles.
- **Semantic Versioning**: Maintain synchronized `version` (human readable e.g., `1.4.0`) and `buildNumber` / `versionCode` (monotonically increasing integer).

See [`references/cross_platform_patterns.md`](./references/cross_platform_patterns.md) for full project configurations.
