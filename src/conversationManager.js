class ConversationManager {
	constructor() {
		this.chatHistories = {};
		this.userPreferences = {};
		this.defaultPreferences = {
			model: 'claude-3-haiku-20240307',
			prompt: 'helpful_assistant',
		};
		this.lastInteractionTimestamps = {};
	}

	getHistory(userId) {
		return (
			this.chatHistories[userId]?.map((line, index) => ({
				role: index % 2 === 0 ? 'user' : 'assistant',
				content: line,
			})) || []
		);
	}

	getGoogleHistory(userId) {
		return (
			this.chatHistories[userId]?.map((line, index) => ({
				role: index % 2 === 0 ? 'user' : 'model',
				parts: [{ text: line }],
			})) || []
		);
	}

	updateChatHistory(userId, userMessage, modelResponse) {
		if (!this.chatHistories[userId]) {
			this.chatHistories[userId] = [];
		}
		this.chatHistories[userId].push(userMessage);
		this.chatHistories[userId].push(modelResponse);
		this.lastInteractionTimestamps[userId] = Date.now();
	}

	clearHistory(userId) {
		delete this.chatHistories[userId];
	}

	resetUserPreferences(userId) {
		this.userPreferences[userId] = {
			model: this.defaultPreferences.model,
			prompt: this.defaultPreferences.prompt,
		};
		console.log(`User preferences reset for user ${userId}:`, this.userPreferences[userId]);
	}

	isNewConversation(userId) {
		return !this.chatHistories[userId] || this.chatHistories[userId].length === 0;
	}

	async handleModelResponse(botMessage, response, originalMessage, stopTyping) {
		const userId = originalMessage.author.id;
		try {
			let finalResponse;
			if (typeof response === 'function') {
				// Google AI response
				const messageResult = await response();
				finalResponse = '';
				for await (const chunk of messageResult.stream) {
					finalResponse += await chunk.text();
				}
			} else {
				// Anthropic response
				finalResponse = response.content[0].text;
			}
			// Split the response into chunks of 2000 characters or less
			const chunks = this.splitResponse(finalResponse);
			// Send each chunk as a separate message and update the typing indicator between each chunk
			for (const chunk of chunks) {
				await botMessage.channel.sendTyping();
				await botMessage.channel.send(chunk);
			}
			this.updateChatHistory(userId, originalMessage.content, finalResponse);
			// Send the clear command message after every bot message
			const userPreferences = this.getUserPreferences(userId);
			const modelName = userPreferences.model;
			const messageCount = this.chatHistories[userId].length;
			if (messageCount % 3 === 0) {
				const clearCommandMessage = `
			  > *Hello! You are currently using the \`${modelName}\` model. If you'd like to start a new conversation, please use the \`/clear\` command. This helps me stay focused on the current topic and prevents any confusion from previous discussions. For a full list of available commands, type \`/help\` command.*
			`;
				await botMessage.channel.send(clearCommandMessage);
			}
		} catch (error) {
			await errorHandler.handleModelResponseError(error, botMessage, originalMessage);
		} finally {
			stopTyping();
		}
	}

	splitResponse(response) {
		const chunks = [];
		const maxLength = 2000;

		while (response.length > maxLength) {
			const chunk = response.slice(0, maxLength);
			const lastSpaceIndex = chunk.lastIndexOf(' ');
			const sliceIndex = lastSpaceIndex !== -1 ? lastSpaceIndex : maxLength;
			chunks.push(response.slice(0, sliceIndex));
			response = response.slice(sliceIndex).trim();
		}

		if (response.length > 0) {
			chunks.push(response);
		}

		return chunks;
	}

	getUserPreferences(userId) {
		console.log(`Getting user preferences for user ${userId}:`, this.userPreferences[userId]);
		return this.userPreferences[userId] ? { ...this.userPreferences[userId] } : { ...this.defaultPreferences };
	}

	setUserPreferences(userId, preferences) {
		this.userPreferences[userId] = {
			...this.getUserPreferences(userId),
			...preferences,
		};
		console.log(`Updated user preferences for user ${userId}:`, this.userPreferences[userId]);
	}

	clearInactiveConversations(inactivityDuration) {
		const currentTime = Date.now();
		for (const userId in this.lastInteractionTimestamps) {
			if (currentTime - this.lastInteractionTimestamps[userId] > inactivityDuration) {
				delete this.chatHistories[userId];
				delete this.lastInteractionTimestamps[userId];
			}
		}
	}
}

module.exports.ConversationManager = ConversationManager;
