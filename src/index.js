// Import required modules
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { Anthropic } = require('@anthropic-ai/sdk');
const async = require('async');
const rateLimit = require('express-rate-limit');
const Bottleneck = require('bottleneck');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import custom modules
const { ConversationManager } = require('./conversationManager');
const { CommandHandler } = require('./commandHandler');
const { config } = require('./config');
const { ErrorHandler } = require('./errorHandler');
const { onInteractionCreate } = require('./interactionCreateHandler');
const { onMessageCreate } = require('./messageCreateHandler');

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 4000;

// Initialize Discord client
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
});

// Initialize AI services
const anthropic = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY,
	baseURL: process.env.CLOUDFLARE_AI_GATEWAY_URL,
});

const googleApiKeys = [
	process.env.GOOGLE_API_KEY_1,
	process.env.GOOGLE_API_KEY_2,
	process.env.GOOGLE_API_KEY_3,
	process.env.GOOGLE_API_KEY_4,
	process.env.GOOGLE_API_KEY_5,
];

const genAIInstances = googleApiKeys.map((apiKey) => new GoogleGenerativeAI(apiKey));

// Initialize custom classes
const errorHandler = new ErrorHandler();
const conversationManager = new ConversationManager(errorHandler);
const commandHandler = new CommandHandler();
const conversationQueue = async.queue(processConversation, 1);

// Create rate limiters
const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // limit each user to 10 requests per windows
	message: 'Too many requests, please try again later.',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	proxy: true,
});

const anthropicLimiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 2000, // 30 requests per minute (60000ms / 30 = 2000ms)
});

const googleLimiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 2000, // 30 requests per minute (60000ms / 30 = 2000ms)
});

// Apply rate limiter middleware to Express app
app.use(limiter);

// Discord bot event listeners
let activityIndex = 0;
client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	// Set the initial status
	client.user.setPresence({
		activities: [config.activities[activityIndex]],
		status: 'online',
	});
	// Change the activity every 30000ms (30 seconds)
	setInterval(() => {
		activityIndex = (activityIndex + 1) % config.activities.length;
		client.user.setPresence({
			activities: [config.activities[activityIndex]],
			status: 'online',
		});
	}, 30000);
});

client.on('interactionCreate', async (interaction) => {
	await onInteractionCreate(interaction, conversationManager, commandHandler, errorHandler);
});

client.on('messageCreate', async (message) => {
	await onMessageCreate(message, conversationQueue, errorHandler, conversationManager);
});

client.on('guildMemberRemove', async (member) => {
	const userId = member.user.id;
	if (conversationManager.isActiveConversation(userId)) {
		await conversationManager.stopTyping(userId);
	}
});

client.on('channelDelete', async (channel) => {
	const channelId = channel.id;
	const activeConversations = conversationManager.getActiveConversationsByChannel(channelId);
	const stopTypingPromises = activeConversations.map((userId) => conversationManager.stopTyping(userId));
	await Promise.all(stopTypingPromises);
});

// Conversation processing function
async function processConversation({ message, messageContent }) {
	try {
		// Start the typing indicator instantly
		message.channel.sendTyping();

		const userPreferences = conversationManager.getUserPreferences(message.author.id);
		console.log(`User preferences for user ${message.author.id}:`, userPreferences);

		const modelName = userPreferences.model;

		// Shuffle the config.thinkingMessages array using Fisher-Yates shuffle algorithm
		const shuffledThinkingMessages = shuffleArray(config.thinkingMessages);

		if (modelName.startsWith('claude')) {
			// Use Anthropic API (Claude)
			const systemPrompt = config.getPrompt(userPreferences.prompt);
			console.log(`System prompt for user ${message.author.id}:`, systemPrompt);

			const response = await anthropicLimiter.schedule(() =>
				anthropic.messages.create({
					model: modelName,
					max_tokens: 4096,
					system: systemPrompt,
					messages: conversationManager.getHistory(message.author.id).concat([{ role: 'user', content: messageContent }]),
				}),
			);

			// Select the first message from the shuffled array
			const botMessage = await message.reply(shuffledThinkingMessages[0]);
			await conversationManager.startTyping(message.author.id);

			await conversationManager.handleModelResponse(botMessage, response, message, async () => {
				await conversationManager.stopTyping(message.author.id);
			});
		} else if (modelName === process.env.GOOGLE_MODEL_NAME) {
			// Use Google Generative AI
			const genAIIndex = message.id % genAIInstances.length;
			const genAI = genAIInstances[genAIIndex];
			const model = await googleLimiter.schedule(() => genAI.getGenerativeModel({ model: modelName }));
			const systemInstruction = config.getPrompt(userPreferences.prompt);
			const chat = model.startChat({
				history: conversationManager.getGoogleHistory(message.author.id),
				safetySettings: config.safetySettings,
				systemInstruction: systemInstruction,
			});

			// Select the first message from the shuffled array
			const botMessage = await message.reply(shuffledThinkingMessages[0]);
			await conversationManager.startTyping(message.author.id);

			await conversationManager.handleModelResponse(
				botMessage,
				() => chat.sendMessageStream(messageContent),
				message,
				async () => {
					await conversationManager.stopTyping(message.author.id);
				},
			);
		}

		// Check if it's a new conversation or the bot is mentioned
		if (conversationManager.isNewConversation(message.author.id) || message.mentions.users.has(client.user.id)) {
			await message.channel.send(config.messages.newConversation);
		}
	} catch (error) {
		await conversationManager.stopTyping(message.author.id);
		await errorHandler.handleError(error, message);
	}
}

// Utility functions
function shuffleArray(array) {
	const shuffledArray = [...array];
	for (let i = shuffledArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
	}
	return shuffledArray;
}

// Clear inactive conversations interval
const inactivityDuration = process.env.CONVERSATION_INACTIVITY_DURATION || 3 * 60 * 60 * 1000; // Default: 3 hours
setInterval(() => {
	conversationManager.clearInactiveConversations(inactivityDuration);
}, inactivityDuration);

// Error handling
process.on('unhandledRejection', (error) => {
	errorHandler.handleUnhandledRejection(error);
});

process.on('uncaughtException', (error) => {
	errorHandler.handleUncaughtException(error);
});

// Express app setup and server startup
app.get('/', (_req, res) => {
	res.send('Neko Discord Bot is running!');
});

app.listen(port, () => {
	console.log(`Neko Discord Bot is listening on port ${port}`);
});

// Start the Discord bot
client.login(process.env.DISCORD_BOT_TOKEN);
