const { config } = require('./config');

async function onMessageCreate(message, conversationQueue, errorHandler, conversationManager) {
	try {
		if (message.author.bot) return;
		const allowedChannelIds = process.env.ALLOWED_CHANNEL_IDS.split(',');
		const isAllowedChannel = allowedChannelIds.includes(message.channel.id);
		if (isAllowedChannel) {
			const messageContent = message.content.trim();
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

module.exports = { onMessageCreate };
