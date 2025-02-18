/** @type {import('next').NextConfig} */
const nextConfig = {
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Cross-Origin-Opener-Policy",
						value: "same-origin",
					},
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					}
				],
			}
		];
	},
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			'fs': false,
			'path': false,
		};
		return config;
	},
};

export default nextConfig;

