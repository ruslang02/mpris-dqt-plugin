const path = require('path');

module.exports = () => ({
  mode: 'production',
  entry: './src/index.ts',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /mpris-dqt-plugin\/node_modules/g,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
            }
          }
        ]
      },
    ]
  },
  output: {
    filename: 'index.js',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    pathinfo: false,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json', '.wasm']
  }
})