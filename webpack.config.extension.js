const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/extension/popup.ts',
    content: './src/extension/content.ts',
    background: './src/extension/background.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/extension'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  // Enable WebAssembly
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './src/extension/popup.html', to: 'popup.html' },
        { from: './src/extension/manifest.json', to: 'manifest.json' },
        { 
          from: './src/extension/icons', 
          to: 'icons',
          noErrorOnMissing: true
        },
      ],
    }),
  ],
};