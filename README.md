# Discord Bot with Anthropic API (Claude) Integration

This is a Discord bot that integrates with the Anthropic API, specifically the Claude model, to provide conversational capabilities. Claude is a highly capable AI model created by Anthropic. The bot can respond to user messages, maintain conversation history, and perform various commands while engaging users as a witty and funny cat named Neko.

## Features

- Responds to user messages using the Anthropic API and the Claude model (Claude 3 Haiku)
- Maintains conversation history for each user
- Supports slash commands for user interactions
- Clears conversation history using the `/clear` command
- Saves conversation and sends it to the user's inbox using the `/save` command
- Automatically changes the bot's presence status with cat-themed activities
- Engages users with a witty and funny cat persona named Neko
- Shares stories about Neko's owner, Dane-kun, and Neko's parents, Closetoyou and Foundy
- Talks about Neko's adventures in the game Ragnarok Mobile: Eternal Love as a Doram character in the NEKO guild, along with Neko's best friend Aurora, a supportive priest

## Screenshots

![Screenshot](screenshots/Screenshot1.png)

![Screenshot](screenshots/Screenshot2.png)

![Screenshot](screenshots/Screenshot3.png)

![Screenshot](screenshots/Screenshot4.png)

![Screenshot](screenshots/Screenshot5.png)

![Screenshot](screenshots/Screenshot6.png)

![Screenshot](screenshots/Screenshot7.png)

## Neko Discord Bot Setup Guide

This guide will walk you through the process of setting up and running the Neko Discord Bot on your own server.

**Requirements:**
* Node.js and npm (or yarn) installed on your system.
* A Discord account and a server where you have administrator permissions.
* An Anthropic API key with access to the Claude model.

**Steps:**

1. **Clone the Repository:**
    - Open a terminal or command prompt and navigate to the directory where you want to store the bot's files.
    - Clone the repository using git:
    ```bash
    git clone https://github.com/llegomark/anthropic-claude-discord-bot.git
    ```
    - Navigate to the newly created directory:
    ```bash
    cd anthropic-claude-discord-bot
    ```

2. **Install Dependencies:**
    - Install the required dependencies using npm or yarn:
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

3. **Set up Environment Variables:**
    - Create a file named `.env` in the project's root directory.
    - Add the following environment variables to the file, replacing the placeholders with your actual values:
    ```
    DISCORD_BOT_TOKEN=
    ANTHROPIC_API_KEY=
    YOUR_DISCORD_USER_ID=
    DISCORD_CLIENT_ID=
    ALLOWED_CHANNEL_IDS=
    PORT=
    ```
    - You can obtain your bot token from the [Discord Developer Portal](https://discord.com/developers/docs/intro).
    - The Anthropic API key can be obtained from the [Anthropic Console](https://console.anthropic.com/).

4. **Start the Bot:**
    - In the terminal, run the following command to start the bot:
    ```bash
    node index.js
    ```
    - The bot will connect to Discord and be ready to interact with users.

**Interacting with the Bot:**

* **Direct Messages:** Send a direct message to the bot to start a conversation with Neko.
* **Mentions:** Mention the bot in a server channel to get Neko's attention.
* **Slash Commands:** Use the `/clear` command to clear the conversation history or the `/save` command to save the conversation to your inbox.

**Additional Notes:**

* You can customize the bot's behavior and responses by modifying the code in the `conversationManager.js` and `index.js` files.
* The `errorHandler.js` file contains basic error handling logic. You can extend it to implement more robust error handling.
* Make sure to keep your API key and bot token secure. Do not share them publicly.
* Refer to the [Discord.js documentation](https://discord.js.org/docs/packages/discord.js/14.14.1) and the [Anthropic API documentation](https://docs.anthropic.com/claude/docs/intro-to-claude) for more information on the available features and options.

**Enjoy interacting with Neko, the witty and funny cat Discord bot!**

Please keep in mind that this project is a work in progress, and breaking changes or new features may be introduced in future updates.