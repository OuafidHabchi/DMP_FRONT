// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// Add blacklist to exclude jspdf for native platforms
config.resolver.blacklistRE = exclusionList([
    /node_modules\/jspdf\/.*/, // Exclude jspdf
]);

module.exports = config;
