# Conversational Discord Bot (Claude & Gemini)

This Discord bot leverages the Anthropic Claude and Google Gemini APIs to deliver dynamic conversational experiences. Powered by Anthropic's advanced Claude models and Google's robust Gemini language models, the bot can respond to user messages, maintain conversation history, and execute various commands. It also offers engaging interactions with diverse personas, tailored by the selected model and prompt.

## Features

- Responds to user messages using the Anthropic API (Claude models) and Google Generative AI
- Maintains conversation history for each user
- Supports slash commands for user interactions
- Clears conversation history using the `/clear` command
- Saves conversation and sends it to the user's inbox using the `/save` command
- Changes the model used by the bot using the `/model` command
- Changes the system prompt used by the bot using the `/prompt` command
- Resets the model and prompt to the default settings using the `/reset` command
- Displays the list of available commands and their usage using the `/help` command
- Triggers a test error to check the error notification webhook using the `/testerror` command (restricted to the bot owner)
- Displays the user's current model and prompt settings using the `/settings` command
- Automatically changes the bot's presence status with various activities
- Engages users with different personas based on the selected model and prompt:
  - Neko: A witty and funny cat with a passion for gaming and adventures in Ragnarok Mobile: Eternal Love
  - Helpful Assistant: A caring and supportive AI assistant created by Anthropic
  - JavaScript Developer: An experienced JavaScript developer with expertise in modern web development technologies
  - Python Developer: A skilled Python developer with a passion for building efficient and scalable applications
- Implements rate limiting for user requests and API calls to prevent abuse and ensure fair usage
- Handles errors gracefully and sends error notifications via Discord webhook
- Logs errors to files for debugging and monitoring purposes
- Includes a comprehensive test suite using Jest for ensuring code quality and reliability
- Utilizes Upstash Redis for storing and managing allowed channel IDs
- Provides an API endpoint to add or remove allowed channel IDs dynamically
- Optimizes the implementation to reduce Redis queries and improve performance
- Protects the API endpoint with API key-based authentication to prevent unauthorized access

This project is under active development, and I may introduce breaking changes or new features in future updates based on my evolving use case and requirements.

**Enjoy interacting with the Discord bot and exploring its various capabilities!**

## Screenshots

![Screenshot](screenshots/Screenshot1.png)
![Screenshot](screenshots/Screenshot2.png)
![Screenshot](screenshots/Screenshot3.png)
![Screenshot](screenshots/Screenshot4.png)
![Screenshot](screenshots/Screenshot5.png)
![Screenshot](screenshots/Screenshot6.png)
![Screenshot](screenshots/Screenshot7.png)
![Screenshot](screenshots/Screenshot8.png)
![Screenshot](screenshots/Screenshot9.png)
![Screenshot](screenshots/Screenshot10.png)
![Screenshot](screenshots/Screenshot11.png)

## Discord Bot Setup Guide

This guide will walk you through the process of setting up and running the Neko Discord Bot on your own server.

**Requirements:**

- Node.js and npm (or yarn) installed on your system.
- A Discord account and a server where you have administrator permissions.
- An Anthropic API key with access to the Claude models.
- A Google API key with access to the Google Generative AI API.
- An Upstash Redis database for storing allowed channel IDs.

**Steps:**

1. **Clone the Repository:**

   - Open a terminal or command prompt and navigate to the directory where you want to store the bot's files.
   - Clone the repository using git:

   ```bash
   git clone https://github.com/llegomark/discord-bot-claude-gemini.git
   ```

   - Navigate to the newly created directory:

   ```bash
   cd discord-bot-claude-gemini
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
   DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
   ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
   GOOGLE_API_KEY_1=YOUR_GOOGLE_API_KEY_1
   GOOGLE_API_KEY_2=YOUR_GOOGLE_API_KEY_2
   GOOGLE_API_KEY_3=YOUR_GOOGLE_API_KEY_3
   GOOGLE_API_KEY_4=YOUR_GOOGLE_API_KEY_4
   GOOGLE_API_KEY_5=YOUR_GOOGLE_API_KEY_5
   GOOGLE_MODEL_NAME=YOUR_GOOGLE_MODEL_NAME
   DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
   DISCORD_USER_ID=YOUR_DISCORD_USER_ID
   ERROR_NOTIFICATION_WEBHOOK=YOUR_ERROR_NOTIFICATION_WEBHOOK_URL
   CONVERSATION_INACTIVITY_DURATION=INACTIVITY_DURATION_IN_MILLISECONDS
   CLOUDFLARE_AI_GATEWAY_URL=YOUR_CLOUDFLARE_AI_GATEWAY_URL
   PORT=YOUR_DESIRED_PORT_NUMBER
   UPSTASH_REDIS_URL=YOUR_UPSTASH_REDIS_URL
   UPSTASH_REDIS_TOKEN=YOUR_UPSTASH_REDIS_TOKEN
   API_KEY=YOUR_API_KEY
   ```

   - You can obtain your Discord bot token from the [Discord Developer Portal](https://discord.com/developers/docs/intro).
   - The Anthropic API key can be obtained from the [Anthropic Console](https://console.anthropic.com/).
   - The Google API keys can be obtained from the [Google AI Studio](https://aistudio.google.com/app/).
   - Replace `YOUR_DISCORD_USER_ID` with your Discord user ID to restrict the `/testerror` command to the bot owner.
   - Set the `CONVERSATION_INACTIVITY_DURATION` to the desired duration in milliseconds after which inactive conversations will be cleared (default: 3 hours).
   - If you're using Cloudflare AI Gateway for enhanced privacy and security, provide the URL in the `CLOUDFLARE_AI_GATEWAY_URL` variable.
   - Set the `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` variables with your Upstash Redis database URL and token.
   - Generate a unique API key for the API endpoint and set it in the `API_KEY` variable.

4. **Deploy Slash Commands:**

   - Run the following command to deploy the slash commands to your Discord server:

   ```bash
   node src/deploy-commands.js
   ```

5. **Start the Bot:**
   - In the terminal, run the following command to start the bot:
   ```bash
   npm start
   ```
   or
   ```bash
   yarn start
   ```
   - The bot will connect to Discord and be ready to interact with users.

**Interacting with the Bot:**

- **Seamless Conversation:** To chat directly with the bot, ensure you are in a channel where the bot has appropriate permissions and the channel ID is included in the allowed list. Once set up, simply send your message in the channel, and the bot will respond accordingly without needing a mention.
- **Slash Commands:** Use the available slash commands to interact with the bot and perform various actions.

**Managing Allowed Channel IDs:**

- To add or remove allowed channel IDs, make a POST request to the `/api/allowedChannels` endpoint with the following JSON payload:
  ```json
  {
    "channelId": "CHANNEL_ID",
    "action": "add" or "remove"
  }
  ```
- Include the API key in the request headers using the `X-API-Key` header.
- Example cURL command to add a channel ID:
  ```bash
  curl -X POST -H "Content-Type: application/json" -H "X-API-Key: YOUR_API_KEY" -d '{"channelId": "1234567890", "action": "add"}' http://localhost:4000/api/allowedChannels
  ```

**Additional Notes:**

- You can customize the bot's behavior and responses by modifying the code in the `src` folder.
- The `errorHandler.js` file contains error handling logic, including sending error notifications via Discord webhook and logging errors to files.
- Make sure to keep your API keys, bot token, and Upstash Redis credentials secure. Do not share them publicly.
- Refer to the [Discord.js documentation](https://discord.js.org/docs/packages/discord.js/14.14.1), [Anthropic API documentation](https://docs.anthropic.com/claude/docs/intro-to-claude), and [Google Gemini API documentation](https://ai.google.dev/docs) for more information on the available features and options.

## Running Tests

The project includes a comprehensive test suite using Jest. To run the tests, use the following command:

```bash
npm test
```

or

```bash
yarn test
```

The test results will be displayed in the console, showing the number of passed and failed tests, as well as the test coverage report.

## Frequently Asked Questions (FAQ)

**Q: Do you have plans to integrate the OpenAI API?**
A: No, I currently have no plans to integrate the OpenAI API. The responses from Claude and Gemini are excellent for my use case, and I've been very satisfied with their performance since the release of Claude 3.

**Q: What about Gemini 1.5 Pro API?**
A: I already have access to the Google Gemini 1.5 Pro model, and I plan to integrate it into the Discord bot as soon as the API access becomes publicly available and exits the beta stage.

**Q: How can I host this Discord bot?**
A: The README file provides a comprehensive setup guide for hosting the bot on your own server. If you require assistance with installation and setup, I offer bot hosting services for a small fee. Please contact me directly for more information.

**Note:** These are some of the frequently asked questions I receive via Discord. If you have any other questions or need further clarification, feel free to reach out to me directly.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
