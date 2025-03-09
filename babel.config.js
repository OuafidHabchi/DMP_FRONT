module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // Use this instead of "expo-router/babel"
  };
};
