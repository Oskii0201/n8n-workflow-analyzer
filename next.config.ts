/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },

    compress: true,
    poweredByHeader: false,

    typescript: {
        ignoreBuildErrors: false,
    }
}

module.exports = nextConfig
