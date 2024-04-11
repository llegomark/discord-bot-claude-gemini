const express = require('express');
const redisClient = require('./redisClient');

const router = express.Router();

const ALLOWED_CHANNELS_KEY = 'allowed_channels';

router.post('/channels', async (req, res) => {
	try {
		const { channelId } = req.body;
		await redisClient.sadd(ALLOWED_CHANNELS_KEY, channelId);
		res.status(200).json({ message: 'Channel added successfully' });
	} catch (error) {
		console.error('Error adding channel:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.delete('/channels/:channelId', async (req, res) => {
	try {
		const { channelId } = req.params;
		await redisClient.srem(ALLOWED_CHANNELS_KEY, channelId);
		res.status(200).json({ message: 'Channel removed successfully' });
	} catch (error) {
		console.error('Error removing channel:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
