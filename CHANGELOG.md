# Changelog

## 0.6.0 — 2026-10-06

### Added
- Sign in with a RoMM API token or scan a pairing QR code to configure the server and authenticate.
- Store sessions in the device's secure storage and refresh OAuth tokens automatically.
- Search the dashboard, platforms, collections, and ROM lists; browse smart collections and filter played or unfinished games.
- View ROM screenshots and additional metadata, and update ratings and play status.
- Restore battery saves from the server and upload them during play; save states can be sent from the emulator menu.
- Download ROMs to a device folder and upload large ROMs in chunks.
- Load EmulatorJS from the RoMM server with a CDN fallback, and load platform firmware as BIOS files.
- Open PSP and DOS games in the browser when their cores cannot run in the in-app WebView.
- Add responsive ROM grids, improved image loading, error handling, and light and dark themes.

### Changed
- Upgrade to Expo SDK 55 and React Native 0.83, and use TanStack Query for server data.
- Replace the previous navigation, authentication, and app state flows with a session-aware app structure.
- Raise Android version code to 7 and enable release code shrinking and resource optimization.
- Update the README, store listing, privacy policy, and add terms of use and the MIT license.

### Fixed
- Refresh OAuth sessions safely when multiple requests encounter an expired access token.
- Send authentication tokens with emulator and ROM download requests.
- Support RoMM servers reachable over HTTP on local networks.
