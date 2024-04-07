require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActivityType } = require('discord.js');
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

app.get('/', (_req, res) => {
  res.send('Neko Discord Bot is running!');
});

app.listen(port, () => {
  console.log(`Neko Discord Bot is listening on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const conversationManager = new ConversationManager();
const commandHandler = new CommandHandler();
const conversationQueue = async.queue(processConversation, 1);

const activities = [
  { name: 'Chasing virtual mice 🐭', type: ActivityType.Playing },
  { name: 'Purring to the sound of Prontera Theme Song 😽', type: ActivityType.Listening },
  { name: 'Watching for new messages to pounce on 🐾', type: ActivityType.Watching },
  { name: 'Napping between conversations 😴', type: ActivityType.Playing },
  { name: 'Grooming my virtual fur 🐈', type: ActivityType.Playing },
  { name: 'Plotting world domination... I mean, meow! 😼', type: ActivityType.Watching },
];
let activityIndex = 0;

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

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Set the initial status
  client.user.setPresence({
    activities: [activities[activityIndex]],
    status: 'online',
  });
  // Change the activity every 30000ms (30 seconds)
  setInterval(() => {
    activityIndex = (activityIndex + 1) % activities.length;
    client.user.setPresence({
      activities: [activities[activityIndex]],
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
      console.error('Error handling /help command:', error);
      await interaction.reply('Sorry, something went wrong while displaying the help message.');
    }
    return;
  }

  if (interaction.commandName === 'clear') {
    try {
      await interaction.deferReply();
      conversationManager.clearHistory(interaction.user.id);
      await interaction.editReply('Your conversation history has been cleared.');
    } catch (error) {
      console.error('Error handling /clear command:', error);
      try {
        if (interaction.deferred) {
          await interaction.editReply('Sorry, something went wrong while clearing your conversation history.');
        } else {
          await interaction.reply('Sorry, something went wrong while clearing your conversation history.');
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

  if (interaction.commandName === 'save') {
    try {
      await interaction.deferReply();
      await commandHandler.saveCommand(interaction, conversationManager);
      await interaction.editReply('The conversation has been saved and sent to your inbox.');
    } catch (error) {
      console.error('Error handling /save command:', error);
      try {
        if (interaction.deferred) {
          await interaction.editReply('Sorry, something went wrong while saving your conversation.');
        } else {
          await interaction.reply('Sorry, something went wrong while saving your conversation.');
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

  if (interaction.commandName === 'model') {
    try {
      await interaction.deferReply();
      await commandHandler.modelCommand(interaction, conversationManager);
      await interaction.editReply(`The model has been set to ${interaction.options.getString('name')}.`);
    } catch (error) {
      console.error('Error handling /model command:', error);
      try {
        if (interaction.deferred) {
          await interaction.editReply('Sorry, something went wrong while setting the model.');
        } else {
          await interaction.reply('Sorry, something went wrong while setting the model.');
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
    return;
  }

  if (interaction.commandName === 'prompt') {
    try {
      await interaction.deferReply();
      await commandHandler.promptCommand(interaction, conversationManager);
      await interaction.editReply(`> \`The system prompt has been set to ${interaction.options.getString('name')}.\``);
    } catch (error) {
      console.error('Error handling /prompt command:', error);
      try {
        await interaction.editReply('Sorry, something went wrong while setting the system prompt.');
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
        await interaction.followUp('Sorry, something went wrong while setting the system prompt.');
      }
    }
    return;
  }

  if (interaction.commandName === 'reset') {
    try {
      await commandHandler.resetCommand(interaction, conversationManager);
    } catch (error) {
      console.error('Error handling /reset command:', error);
      try {
        await interaction.reply('Sorry, something went wrong while resetting your preferences.');
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
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
    console.error('Error processing the message:', error);
    await message.reply('Sorry, something went wrong!');
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
          messages: conversationManager.getHistory(message.author.id).concat([
            { role: 'user', content: messageContent },
          ]),
        })
      );
      // Array of different thinking messages
      const thinkingMessages = [
        '> `Meow, let me ponder on that for a moment...`',
        '> `Purring in thought, one second...`',
        '> `Hmm, let me scratch my whiskers and think...`',
        '> `*tail swishes back and forth* Meow, processing...`',
        '> `Chasing the answer in my mind, be right back...`',
        '> `Meow, let me consult my whiskers for wisdom...`',
        '> `Purring intensifies as I contemplate your query...`',
        '> `Hmm, let me chase this thought like a laser pointer...`',
        '> `*tail swishes back and forth* Meow, processing at the speed of a catnap...`',
        '> `Chasing the answer in my mind, it\'s like hunting a sneaky mouse...`',
        '> `Meow, let me paw-nder on this for a moment...`',
        '> `*stretches lazily* Meow, just waking up my brain cells...`',
        '> `Purrhaps I should ask my feline ancestors for guidance...`',
        '> `*knocks over a glass of water* Oops, I meant to do that! Meow, thinking...`',
        '> `Meow, let me consult the ancient cat scriptures...`',
        '> `*chases own tail* Meow, I\'m on the tail of a great idea...`',
        '> `Meow, let me nap on this thought for a bit...`',
        '> `*stares intently at a blank wall* Meow, downloading inspiration...`',
        '> `Purring my way through this mental obstacle course...`',
        '> `*bats at a toy mouse* Meow, just warming up my problem-solving skills...`',
        '> `Meow, let me dig through my litter box of knowledge...`',
        '> `*sits in an empty box* Meow, thinking outside the box...`',
        '> `Meow, let me groom my brain for maximum clarity...`',
        '> `*knocks over a potted plant* Meow, just rearranging my thoughts...`',
        '> `Purring my way to a purrfect answer, one moment...`',
      ];
      // Shuffle the thinkingMessages array using Fisher-Yates shuffle algorithm
      for (let i = thinkingMessages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [thinkingMessages[i], thinkingMessages[j]] = [thinkingMessages[j], thinkingMessages[i]];
      }
      // Select the first message from the shuffled array
      const botMessage = await message.reply(thinkingMessages[0]);
      await startTyping();
      await conversationManager.handleModelResponse(botMessage, response, message, stopTyping);
    } else if (modelName === 'gemini-pro') {
      // Use Google Generative AI
      const model = await genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({
        history: conversationManager.getGoogleHistory(message.author.id),
        safetySettings: config.safetySettings,
      });
      const botMessage = await message.reply('> `Generating a response...`');
      await startTyping();
      await conversationManager.handleModelResponse(botMessage, () => chat.sendMessageStream(messageContent), message, stopTyping);
    }

    // Check if it's a new conversation or the bot is mentioned
    if (conversationManager.isNewConversation(message.author.id) || message.mentions.users.has(client.user.id)) {
      const clearCommandMessage = `
        > *Hello! If you'd like to start a new conversation, please use the \`/clear\` command. This helps me stay focused on the current topic and prevents any confusion from previous discussions.*
      `;
      await message.channel.send(clearCommandMessage);
    }
  } catch (error) {
    console.error('Error processing the conversation:', error);
    if (error.status === 429) {
      await message.reply('Meow, I\'m a bit overloaded right now. Please try again later! 😿');
    } else {
      await message.reply('Sorry, something went wrong!');
    }
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);