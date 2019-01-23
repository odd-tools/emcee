const path = require('path');
const outputRoot = path.resolve(__dirname, 'build/');
const bundleName = 'emcee.js';

module.exports = {
    target: 'web',
    entry: 'emcee.ts',
    output: {
        path: outputRoot,
        filename: bundleName
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        modules: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, 'node_modules')
        ],
        extensions: [".js", ".ts"]
    }
};