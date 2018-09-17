import json from "rollup-plugin-json";

export default {
	input: "dist/src/index.js",
	output: {
		file: "build/js/counterfactual.min.js",
		format: "iife",
		sourcemap: true,
		name: "cf"
	},
	plugins: [
		json({
			include: [
				"dist/contracts/build/contracts/*",
				"dist/contracts/networks/*"
			],
			preferConst: true
		})
	]
};
