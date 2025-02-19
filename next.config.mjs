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
			},
			{
				source: "/ffmpeg/:path*",
				headers: [
					{
						key: "Content-Type",
						value: "application/wasm",
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
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
		};
		return config;
	},
};

export default nextConfig;

