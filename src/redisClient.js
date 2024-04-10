const { Redis } = require('@upstash/redis');

const redisClient = new Redis({
	url: process.env.UPSTASH_REDIS_URL,
	token: process.env.UPSTASH_REDIS_TOKEN,
});

module.exports = redisClient;
