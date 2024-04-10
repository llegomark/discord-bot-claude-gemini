const { ConversationManager } = require('./conversationManager');
const { config } = require('./config');

describe('ConversationManager', () => {
	let conversationManager;
	let errorHandler;

	beforeEach(() => {
		errorHandler = {
			handleError: jest.fn(),
		};
		conversationManager = new ConversationManager(errorHandler);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should initialize with empty chat histories and user preferences', () => {
		expect(conversationManager.chatHistories).toEqual({});
		expect(conversationManager.userPreferences).toEqual({});
	});

	test('should get and update chat history for a user', () => {
		const userId = '123';
		const userMessage = 'Hello';
		const modelResponse = 'Hi there!';

		conversationManager.updateChatHistory(userId, userMessage, modelResponse);

		expect(conversationManager.getHistory(userId)).toEqual([
			{ role: 'user', content: userMessage },
			{ role: 'assistant', content: modelResponse },
		]);
	});

	test('should clear chat history for a user', () => {
		const userId = '123';
		conversationManager.chatHistories[userId] = ['Message 1', 'Message 2'];

		conversationManager.clearHistory(userId);

		expect(conversationManager.chatHistories[userId]).toBeUndefined();
	});

	test('should reset user preferences to default', () => {
		const userId = '123';
		conversationManager.userPreferences[userId] = {
			model: 'custom-model',
			prompt: 'custom-prompt',
		};

		conversationManager.resetUserPreferences(userId);

		expect(conversationManager.userPreferences[userId]).toEqual({
			model: process.env.GOOGLE_MODEL_NAME,
			prompt: 'helpful_assistant',
		});
	});

	test('should check if it is a new conversation for a user', () => {
		const userId = '123';

		expect(conversationManager.isNewConversation(userId)).toBe(true);

		conversationManager.chatHistories[userId] = ['Message 1'];

		expect(conversationManager.isNewConversation(userId)).toBe(false);
	});

	test('should handle model response and update chat history', async () => {
		const userId = '123';
		const botMessage = {
			channel: {
				sendTyping: jest.fn(),
				send: jest.fn(),
			},
		};
		const response = {
			content: [{ text: 'Model response' }],
		};
		const originalMessage = {
			author: { id: userId },
			content: 'User message',
		};
		const stopTyping = jest.fn();

		await conversationManager.handleModelResponse(botMessage, response, originalMessage, stopTyping);

		expect(botMessage.channel.sendTyping).toHaveBeenCalled();
		expect(botMessage.channel.send).toHaveBeenCalledWith('Model response');
		expect(conversationManager.chatHistories[userId]).toEqual(['User message', 'Model response']);
		expect(stopTyping).toHaveBeenCalled();
	});

	test('should split response into chunks and send them separately', async () => {
		const userId = '123';
		const botMessage = {
			channel: {
				sendTyping: jest.fn(),
				send: jest.fn(),
			},
		};
		const response = {
			content: [{ text: 'A'.repeat(4000) }],
		};
		const originalMessage = {
			author: { id: userId },
			content: 'User message',
		};
		const stopTyping = jest.fn();

		await conversationManager.handleModelResponse(botMessage, response, originalMessage, stopTyping);

		expect(botMessage.channel.send).toHaveBeenCalledTimes(2);
		expect(stopTyping).toHaveBeenCalled();
	});

	test('should get user preferences or set default preferences', () => {
		const userId = '123';

		expect(conversationManager.getUserPreferences(userId)).toEqual({
			model: process.env.GOOGLE_MODEL_NAME,
			prompt: 'helpful_assistant',
		});

		conversationManager.setUserPreferences(userId, { model: 'custom-model' });

		expect(conversationManager.getUserPreferences(userId)).toEqual({
			model: 'custom-model',
			prompt: 'helpful_assistant',
		});
	});

	test('should clear inactive conversations based on inactivity duration', () => {
		const userId1 = '123';
		const userId2 = '456';
		conversationManager.chatHistories[userId1] = ['Message 1'];
		conversationManager.chatHistories[userId2] = ['Message 2'];
		conversationManager.lastInteractionTimestamps[userId1] = Date.now() - 5000;
		conversationManager.lastInteractionTimestamps[userId2] = Date.now() - 10000;

		conversationManager.clearInactiveConversations(8000);

		expect(conversationManager.chatHistories[userId1]).toEqual(['Message 1']);
		expect(conversationManager.chatHistories[userId2]).toBeUndefined();
		expect(conversationManager.lastInteractionTimestamps[userId1]).toBeDefined();
		expect(conversationManager.lastInteractionTimestamps[userId2]).toBeUndefined();
	});

	test('should start and stop typing indicators for a user', async () => {
		const userId = '123';
		const sendTyping = jest.fn();
		conversationManager.getLastMessageChannel = jest.fn(() => ({ sendTyping }));

		await conversationManager.startTyping(userId);
		expect(conversationManager.typingIntervalIds[userId]).toBeDefined();

		await conversationManager.stopTyping(userId);
		expect(conversationManager.typingIntervalIds[userId]).toBeUndefined();
	});

	test('should check if a conversation is active for a user', () => {
		const userId = '123';

		expect(conversationManager.isActiveConversation(userId)).toBe(false);

		conversationManager.chatHistories[userId] = ['Message 1'];

		expect(conversationManager.isActiveConversation(userId)).toBe(true);
	});

	test('should get active conversations by channel', () => {
		const userId1 = '123';
		const userId2 = '456';
		const channelId = '789';
		conversationManager.chatHistories[userId1] = ['Message 1'];
		conversationManager.chatHistories[userId2] = ['Message 2'];
		conversationManager.getLastMessage = jest.fn((userId) => ({
			channel: { id: userId === userId1 ? channelId : 'other-channel' },
		}));

		const activeConversations = conversationManager.getActiveConversationsByChannel(channelId);

		expect(activeConversations).toEqual([userId1]);
	});

	test('should get the last message for a user', () => {
		const userId = '123';
		conversationManager.chatHistories[userId] = ['Message 1', 'Message 2'];

		const lastMessage = conversationManager.getLastMessage(userId);

		expect(lastMessage).toBe('Message 2');
	});

	test('should get the last message channel for a user', () => {
		const userId = '123';
		const channel = { id: '456' };
		conversationManager.getLastMessage = jest.fn(() => ({ channel }));

		const lastMessageChannel = conversationManager.getLastMessageChannel(userId);

		expect(lastMessageChannel).toBe(channel);
	});

	test('should handle Google AI response and update chat history', async () => {
		const userId = '123';
		const botMessage = {
			channel: {
				sendTyping: jest.fn(),
				send: jest.fn(),
			},
		};
		const response = () => ({
			stream: (async function* () {
				yield { text: () => Promise.resolve('Google AI response') };
			})(),
		});
		const originalMessage = {
			author: { id: userId },
			content: 'User message',
		};
		const stopTyping = jest.fn();

		await conversationManager.handleModelResponse(botMessage, response, originalMessage, stopTyping);

		expect(botMessage.channel.sendTyping).toHaveBeenCalled();
		expect(botMessage.channel.send).toHaveBeenCalledWith('Google AI response');
		expect(conversationManager.chatHistories[userId]).toEqual(['User message', 'Google AI response']);
		expect(stopTyping).toHaveBeenCalled();
	});

	test('should send clear command message after every 3 bot messages', async () => {
		const userId = '123';
		const botMessage = {
			channel: {
				sendTyping: jest.fn(),
				send: jest.fn(),
			},
		};
		const response = {
			content: [{ text: 'Model response' }],
		};
		const originalMessage = {
			author: { id: userId },
			content: 'User message',
		};
		const stopTyping = jest.fn();

		// Send 3 bot messages
		for (let i = 0; i < 3; i++) {
			await conversationManager.handleModelResponse(botMessage, response, originalMessage, stopTyping);
		}

		const userPreferences = conversationManager.getUserPreferences(userId);
		const modelName = userPreferences.model;
		const expectedMessage = config.messages.clearCommand.replace('{modelName}', modelName);

		expect(botMessage.channel.send).toHaveBeenCalledWith(expectedMessage);
	});

	test('should handle error and call error handler', async () => {
		const userId = '123';
		const botMessage = {
			channel: {
				sendTyping: jest.fn(),
				send: jest.fn(),
			},
		};
		const response = {
			content: [{ text: 'Model response' }],
		};
		const originalMessage = {
			author: { id: userId },
			content: 'User message',
		};
		const stopTyping = jest.fn();
		const errorMessage = 'Test error';

		// Mock the error handler
		const mockErrorHandler = {
			handleError: jest.fn(),
		};
		conversationManager.errorHandler = mockErrorHandler;

		// Mock an error during model response handling
		botMessage.channel.send.mockImplementationOnce(() => {
			throw new Error(errorMessage);
		});

		await conversationManager.handleModelResponse(botMessage, response, originalMessage, stopTyping);

		expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.objectContaining({ message: errorMessage }), originalMessage);
		expect(stopTyping).toHaveBeenCalled();
	});

	test('should get Google history for a user', () => {
		const userId = '123';
		conversationManager.chatHistories[userId] = ['User message', 'Model response'];

		const googleHistory = conversationManager.getGoogleHistory(userId);

		expect(googleHistory).toEqual([
			{ role: 'user', parts: [{ text: 'User message' }] },
			{ role: 'model', parts: [{ text: 'Model response' }] },
		]);
	});

	test('should update chat history with multiple messages', () => {
		const userId = '123';
		const userMessage1 = 'User message 1';
		const modelResponse1 = 'Model response 1';
		const userMessage2 = 'User message 2';
		const modelResponse2 = 'Model response 2';

		conversationManager.updateChatHistory(userId, userMessage1, modelResponse1);
		conversationManager.updateChatHistory(userId, userMessage2, modelResponse2);

		expect(conversationManager.getHistory(userId)).toEqual([
			{ role: 'user', content: userMessage1 },
			{ role: 'assistant', content: modelResponse1 },
			{ role: 'user', content: userMessage2 },
			{ role: 'assistant', content: modelResponse2 },
		]);
	});

	test('should get prompt from config', () => {
		const promptName = 'helpful_assistant';
		const prompt = config.getPrompt(promptName);

		expect(prompt).toBe(config.prompts[promptName]);
	});

	test('should return empty string for unknown prompt name', () => {
		const promptName = 'unknown_prompt';
		const prompt = config.getPrompt(promptName);

		expect(prompt).toBe('');
	});

	test('should get clear command message from config', () => {
		const modelName = 'custom-model';
		const expectedMessage = config.messages.clearCommand.replace('{modelName}', modelName);

		expect(expectedMessage).toContain(modelName);
	});

	test('should get new conversation message from config', () => {
		const newConversationMessage = config.messages.newConversation;

		expect(newConversationMessage).toBeDefined();
	});

	test('should get privacy notice message from config', () => {
		const privacyNoticeMessage = config.messages.privacyNotice;

		expect(privacyNoticeMessage).toBeDefined();
	});

	test('should return null when there is no last message for a user', () => {
		const userId = '123';
		conversationManager.getLastMessage = jest.fn(() => null);

		const lastMessageChannel = conversationManager.getLastMessageChannel(userId);

		expect(lastMessageChannel).toBeNull();
	});

	test('should not clear conversations when there are no inactive conversations', () => {
		const userId = '123';
		conversationManager.chatHistories[userId] = ['Message 1'];
		conversationManager.lastInteractionTimestamps[userId] = Date.now();

		conversationManager.clearInactiveConversations(5000);

		expect(conversationManager.chatHistories[userId]).toEqual(['Message 1']);
		expect(conversationManager.lastInteractionTimestamps[userId]).toBeDefined();
	});

	test('should partially update user preferences', () => {
		const userId = '123';
		conversationManager.setUserPreferences(userId, { model: 'custom-model' });
		conversationManager.setUserPreferences(userId, { prompt: 'custom-prompt' });

		expect(conversationManager.getUserPreferences(userId)).toEqual({
			model: 'custom-model',
			prompt: 'custom-prompt',
		});
	});

	test('should handle error during Google AI response processing', async () => {
		const userId = '123';
		const botMessage = {
			channel: {
				sendTyping: jest.fn(),
				send: jest.fn(),
			},
		};
		const response = () => ({
			stream: (async function* () {
				throw new Error('Google AI error');
			})(),
		});
		const originalMessage = {
			author: { id: userId },
			content: 'User message',
		};
		const stopTyping = jest.fn();

		await conversationManager.handleModelResponse(botMessage, response, originalMessage, stopTyping);

		expect(errorHandler.handleError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Google AI error' }), originalMessage);
		expect(stopTyping).toHaveBeenCalled();
	});

	test('should handle undefined last message', () => {
		const userId = '123';
		conversationManager.getLastMessage = jest.fn(() => undefined);

		const lastMessageChannel = conversationManager.getLastMessageChannel(userId);

		expect(lastMessageChannel).toBeNull();
	});
});
