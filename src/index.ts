import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      USER_ID: string;
      CHANNEL: string;
      TIMEOUT: string;
    }
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers
  ]
});

const targetUserId = process.env.USER_ID
const targetChannelId = process.env.CHANNEL

let usedMessages: string[] = [];

function loadJSON(file: string): any {

  const data = readFileSync(file, 'utf-8');
  return JSON.parse(data);

}

function getRandomMessage(): string {

  const messages = loadJSON('./assets/messages.json') as string[];
  const availableMessages = messages.filter((msg: string) => !usedMessages.includes(msg));

  if (availableMessages.length === 0) {

    usedMessages = [];
    return getRandomMessage();
  
  }

  const randomMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
  usedMessages.push(randomMessage);

  writeFileSync('./assets/usedMessages.json', JSON.stringify(usedMessages));

  return randomMessage;

}

async function checkUserActivity() {

  const guild = client.guilds.cache.first();

  if (!guild) 
    return;

  const member = await guild.members.fetch(targetUserId);

  if (!member) 
    return;

  const activities = loadJSON('./assets/activity.json');

  const userActivities = member.presence?.activities || [];

  const isPerformingActivity = userActivities.some(activity => activities.includes(activity.name));

  if (isPerformingActivity) {

    const channel = await client.channels.fetch(targetChannelId) as TextChannel;

    if (channel) {

      const message = getRandomMessage();
      channel.send(message);

    }

  }

}

client.once('ready', () => setInterval(checkUserActivity, Number(process.env.TIMEOUT)));

client.login(process.env.BOT_TOKEN);