// by Cleyvin
// Default Expo Metro config. Extends "expo/metro-config" as recommended by
// expo-doctor. hot-updater hooks in via its Babel plugin (babel.config.js),
// so no custom Metro transforms are required here.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
