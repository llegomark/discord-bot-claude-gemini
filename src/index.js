require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { Anthropic } = require('@anthropic-ai/sdk');
const { ConversationManager } = require('./conversationManager');
const { CommandHandler } = require('./commandHandler');
const async = require('async');
const rateLimit = require('express-rate-limit');
const Bottleneck = require('bottleneck');
const app = express();
const port = process.env.PORT || 4000;
const { helpCommand } = require('./helpCommand');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('./config');
const { ErrorHandler } = require('./errorHandler');

let activityIndex = 0;

app.get('/', (_req, res) => {
	res.send('Neko Discord Bot is running!');
});

app.listen(port, () => {
	console.log(`Neko Discord Bot is listening on port ${port}`);
});

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
});

const anthropic = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY,
	baseURL: process.env.CLOUDFLARE_AI_GATEWAY_URL,
});
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const conversationManager = new ConversationManager();
const commandHandler = new CommandHandler();
const conversationQueue = async.queue(processConversation, 1);
const errorHandler = new ErrorHandler();

// Create a rate limiter middleware
const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // limit each user to 10 requests per windowMs
	message: 'Too many requests, please try again later.',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiter middleware to the Express app
app.use(limiter);

// Create a rate limiter for the Anthropic API
const anthropicLimiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 2000, // 30 requests per minute (60000ms / 30 = 2000ms)
});

// Create a rate limiter for the Google Generative AI API
const googleLimiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 2000, // 30 requests per minute (60000ms / 30 = 2000ms)
});

client.once(Events.ClientReady, () => {
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

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'help') {
		try {
			await helpCommand(interaction);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'clear') {
		try {
			await interaction.deferReply();
			conversationManager.clearHistory(interaction.user.id);
			await interaction.editReply('Your conversation history has been cleared.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'save') {
		try {
			await interaction.deferReply();
			await commandHandler.saveCommand(interaction, conversationManager);
			await interaction.editReply('The conversation has been saved and sent to your inbox.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'model') {
		try {
			await interaction.deferReply();
			await commandHandler.modelCommand(interaction, conversationManager);
			await interaction.editReply(`The model has been set to ${interaction.options.getString('name')}.`);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'prompt') {
		try {
			await interaction.deferReply();
			await commandHandler.promptCommand(interaction, conversationManager);
			await interaction.editReply(`> \`The system prompt has been set to ${interaction.options.getString('name')}.\``);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'reset') {
		try {
			await commandHandler.resetCommand(interaction, conversationManager);
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}

	if (interaction.commandName === 'testerror') {
		try {
			await interaction.deferReply();
			// Check if the user executing the command is the bot owner
			if (interaction.user.id !== process.env.DISCORD_USER_ID) {
				await interaction.editReply('Only the bot owner can use this command.');
				return;
			}
			// Trigger a test error
			throw new Error('This is a test error triggered by the /testerror command.');
		} catch (error) {
			await errorHandler.handleError(error, interaction);
		}
		return;
	}
});

client.on(Events.MessageCreate, async (message) => {
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
});

async function processConversation({ message, messageContent }) {
	try {
		const typingInterval = 1000;
		let typingIntervalId;
		// Start the typing indicator
		const startTyping = async () => {
			typingIntervalId = setInterval(() => {
				message.channel.sendTyping();
			}, typingInterval);
		};
		// Stop the typing indicator
		const stopTyping = () => {
			clearInterval(typingIntervalId);
		};
		// Start the typing indicator instantly
		message.channel.sendTyping();
		const userPreferences = conversationManager.getUserPreferences(message.author.id);
		console.log(`User preferences for user ${message.author.id}:`, userPreferences);
		const modelName = userPreferences.model;
		if (modelName.startsWith('claude')) {
			// Use Anthropic API (Claude)
			const systemPrompt = commandHandler.getPrompt(userPreferences.prompt);
			console.log(`System prompt for user ${message.author.id}:`, systemPrompt);
			const response = await anthropicLimiter.schedule(() =>
				anthropic.messages.create({
					model: modelName,
					max_tokens: 4096,
					system: systemPrompt,
					messages: conversationManager.getHistory(message.author.id).concat([{ role: 'user', content: messageContent }]),
				}),
			);
			// Shuffle the config.thinkingMessages array using Fisher-Yates shuffle algorithm
			const shuffledThinkingMessages = [...config.thinkingMessages];
			for (let i = shuffledThinkingMessages.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffledThinkingMessages[i], shuffledThinkingMessages[j]] = [shuffledThinkingMessages[j], shuffledThinkingMessages[i]];
			}
			// Select the first message from the shuffled array
			const botMessage = await message.reply(shuffledThinkingMessages[0]);
			await startTyping();
			await conversationManager.handleModelResponse(botMessage, response, message, stopTyping);
		} else if (modelName === process.env.GOOGLE_MODEL_NAME) {
			// Use Google Generative AI
			const model = await googleLimiter.schedule(() => genAI.getGenerativeModel({ model: modelName }));
			const chat = model.startChat({
				history: conversationManager.getGoogleHistory(message.author.id),
				safetySettings: config.safetySettings,
			});
			// Shuffle the config.thinkingMessages array using Fisher-Yates shuffle algorithm
			const shuffledThinkingMessages = [...config.thinkingMessages];
			for (let i = shuffledThinkingMessages.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffledThinkingMessages[i], shuffledThinkingMessages[j]] = [shuffledThinkingMessages[j], shuffledThinkingMessages[i]];
			}
			// Select the first message from the shuffled array
			const botMessage = await message.reply(shuffledThinkingMessages[0]);
			await startTyping();
			await conversationManager.handleModelResponse(botMessage, () => chat.sendMessageStream(messageContent), message, stopTyping);
		}
		// Check if it's a new conversation or the bot is mentioned
		if (conversationManager.isNewConversation(message.author.id) || message.mentions.users.has(client.user.id)) {
			const clearCommandMessage = `
        > *Hello! I'm Neko, your friendly AI assistant. You are not required to mention me in your messages. Feel free to start a conversation, and I'll respond accordingly. If you want to clear the conversation history, use the \`/clear\` command.*
      `;
			await message.channel.send(clearCommandMessage);
		}
	} catch (error) {
		await errorHandler.handleError(error, message);
	}
}

process.on('unhandledRejection', (error) => {
	errorHandler.handleUnhandledRejection(error);
});

process.on('uncaughtException', (error) => {
	errorHandler.handleUncaughtException(error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
