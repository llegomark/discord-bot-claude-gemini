module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/test/**/*.test.js'],
	moduleFileExtensions: ['js'],
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	setupFiles: ['dotenv/config'],
};
