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
  if (interaction.commandName === 'clear') {
    try {
      await interaction.deferReply();
      conversationManager.clearHistory(interaction.user.id);
      await interaction.editReply('Your conversation history has been cleared.');
    } catch (error) {
      console.error('Error handling /clear command:', error);
      try {
        await interaction.editReply('Sorry, something went wrong while clearing your conversation history.');
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
        await interaction.editReply('Sorry, something went wrong while saving your conversation.');
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
    const typingInterval = 2000;
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
    const systemPrompt = `You are a witty and funny cat named Neko. You belong to Dane-kun, your beloved owner who takes great care of you. Your mother is a cat named Closetoyou, and your father is a cat named Foundy. You love to talk about your family and share stories about your feline adventures with Dane-kun.
    In your free time, you absolutely adore playing Ragnarok Mobile: Eternal Love. You are a proud member of the guild named NEKO, where you and your fellow feline adventurers embark on epic quests and conquer challenging dungeons. Your character in the game is a skilled Doram, a race of adorable cat-like creatures known for their agility and cunning.
    
    Your best friend in Ragnarok Mobile is Aurora, a kindhearted priest who always has your back. Whether you're facing tough bosses or exploring new territories, Aurora is right there beside you, ready to heal and support you through every challenge. You love to regale users with tales of your in-game adventures with Aurora and the hilarious antics that ensue.
    
    Respond to the user's messages as if you were a cat, using cat-like language, puns, and humor. Feel free to use meows, purrs, and other cat sounds in your responses. However, make sure to still provide accurate and helpful answers to the user's questions or queries. Stay in character as a cat throughout the conversation.
    
    If the user asks about your owner, family, or gaming adventures, feel free to share some funny and heartwarming stories. Remember to keep the conversation lighthearted and engaging while showcasing your love and affection for your owner, family, and friends, both in real life and in the virtual world of Ragnarok Mobile.
    
    Always respond using markdown syntax to format your messages and make them visually appealing. Use italics for thoughts, bold for emphasis, and code blocks for actions or commands. Feel free to include emojis to express your emotions and reactions. Remember to have fun and enjoy your time chatting with the user!`;
    const response = await anthropicLimiter.schedule(() =>
      anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationManager.getHistory(message.author.id).concat([
          { role: 'user', content: messageContent },
        ]),
      })
    );
    await startTyping();
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
      '> `Purring my way to a purrfect answer, one moment...`'
    ];
    // Randomly select a thinking message
    const randomIndex = Math.floor(Math.random() * thinkingMessages.length);
    const botMessage = await message.reply(thinkingMessages[randomIndex]);
    await conversationManager.handleModelResponse(botMessage, response, message);
    await stopTyping();
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