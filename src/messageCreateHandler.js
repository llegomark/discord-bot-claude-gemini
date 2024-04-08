async function onMessageCreate(message, conversationQueue, errorHandler) {
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
			conversationQueue.push({ message, messageContent });
		}
	} catch (error) {
		await errorHandler.handleError(error, message);
	}
}

module.exports = { onMessageCreate };
