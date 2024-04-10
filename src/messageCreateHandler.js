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
				const privacyNotice = `
                    ||\u200B||
                    :warning: **Please be aware that your conversations with me in this channel are public and visible to anyone who can access this channel.** :warning:
                    ||\u200B||
                    If you prefer to have a private conversation, please note that I do not respond to direct messages or private conversations. All interactions with me should take place in the designated channels where I am installed.
                    ||\u200B||
                    By continuing this conversation, you acknowledge that your messages and my responses will be visible to others in this channel. If you have any sensitive or personal information, please refrain from sharing it here.
                    ||\u200B||
                    If you have any concerns or questions about the privacy of our interactions, please contact the server administrators.
                    ||\u200B||
                `;
				await message.channel.send({ content: privacyNotice });
			}
			conversationQueue.push({ message, messageContent });
		}
	} catch (error) {
		await errorHandler.handleError(error, message);
	}
}

module.exports = { onMessageCreate };
