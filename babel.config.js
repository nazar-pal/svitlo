module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... Other plugins
      '@babel/plugin-transform-async-generator-functions'
    ]
  }
}
