const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    target: 'node',
    entry: './src/index.ts',
    externals: [nodeExternals()],
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@api': path.resolve(__dirname, 'src/api'),
            '@entities': path.resolve(__dirname, 'src/entities'),
            '@helpers': path.resolve(__dirname, 'src/helpers'),
            '@auth': path.resolve(__dirname, 'src/auth'),
            '@middlewares': path.resolve(__dirname, 'src/middlewares'),
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.production.json',
                    },
                },
                exclude: /node_modules/,
            },
            {
                loader: 'ifdef-loader',
                options: {
                    production: process.env.NODE_ENV === 'production',
                    demo: process.env.NODE_ENV === 'demo',
                }
            }
        ],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
