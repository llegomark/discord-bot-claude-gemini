const { config } = require('./config');
const redisClient = require('./redisClient');
const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');

let allowedChannelIds = [];

async function fetchAllowedChannelIds() {
	try {
		const channelIds = await redisClient.smembers('allowedChannelIds');
		allowedChannelIds = channelIds;
		console.log('Fetched allowed channel IDs:', allowedChannelIds);
	} catch (error) {
		console.error('Error fetching allowed channel IDs:', error);
	}
}

async function onMessageCreate(message, conversationQueue, errorHandler, conversationManager) {
	try {
		if (message.author.bot) return;

		const isAllowedChannel = allowedChannelIds.includes(message.channel.id);
		if (isAllowedChannel) {
			let messageContent = '';

			if (message.attachments.size > 0) {
				const attachment = message.attachments.first();
				const attachmentExtension = attachment.name.split('.').pop().toLowerCase();

				if (attachmentExtension === 'txt') {
					try {
						const response = await fetch(attachment.url);
						messageContent = await response.text();
					} catch (error) {
						console.error('Error fetching text attachment:', error);
						await message.reply("> `Sorry, there was an error processing your text attachment. Please try again.`");
						return;
					}
				} else if (attachmentExtension === 'pdf') {
					try {
						const response = await fetch(attachment.url);
						const buffer = await response.buffer();
						const data = await pdfParse(buffer);
						messageContent = data.text;
					} catch (error) {
						console.error('Error parsing PDF attachment:', error);
						await message.reply("> `Sorry, there was an error processing your PDF attachment. Please try again.`");
						return;
					}
				} else {
					await message.reply("> `Sorry, only .txt and .pdf file attachments are supported.`");
					return;
				}
			} else {
				messageContent = message.content.trim();
			}

			if (messageContent === '') {
				await message.reply("> `It looks like you didn't say anything. What would you like to talk about?`");
				return;
			}

			if (conversationManager.isNewConversation(message.author.id)) {
				await message.channel.send({ content: config.messages.privacyNotice });
			}

			conversationQueue.push({ message, messageContent });
		}
	} catch (error) {
		await errorHandler.handleError(error, message);
	}
}

// Fetch allowed channel IDs when the module is loaded
fetchAllowedChannelIds();

// Refresh allowed channel IDs every 5 minutes
setInterval(fetchAllowedChannelIds, 5 * 60 * 1000);

module.exports = { onMessageCreate };
