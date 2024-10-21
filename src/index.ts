import 'dotenv/config';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from "path"

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

const targetUserId = process.env.USER_ID;
const targetChannelId = process.env.CHANNEL;
const cooldownPeriod = 28800000; // 8 horas em milissegundos

let lastMessageTimestamp: number = 0;

let usedMessages: string[] = [];

function loadJSON(file: string) {

  try {

    const data = readFileSync(resolve(file), 'utf-8');
    return JSON.parse(data) as string[];

  } catch (error) {

    console.error(`Erro ao carregar o arquivo ${resolve(file)}:`, error);
    return null; 

  }

}

function getRandomMessage() {

  const messages = loadJSON('./assets/messages.json') as string[];
  const availableMessages = messages.filter((msg: string) => !usedMessages.includes(msg));

  if (availableMessages.length === 0)
    usedMessages = [];

  const randomMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
  usedMessages.push(randomMessage);

  writeFileSync('./assets/usedMessages.json', JSON.stringify(usedMessages));

  return randomMessage;

}

async function checkUserActivity() {

  try {

    const guild = client.guilds.cache.first();

    if (!guild) 
      return;

    const member = await guild.members.fetch(targetUserId);
    if (!member) 
      return;

    const activities = loadJSON('./assets/activity.json');
    if (!activities) 
      return;

    const userActivities = member.presence?.activities || [];
    
    const isPerformingActivity = userActivities.some(activity => activities.includes(activity.name));

    const currentTime = Date.now();

    if (isPerformingActivity && currentTime - lastMessageTimestamp >= cooldownPeriod) {

      lastMessageTimestamp = currentTime;

      const channel = await client.channels.fetch(targetChannelId) as TextChannel;

      if (channel) {

        const message = getRandomMessage();

        if (message) 
          channel.send(message);
        
      }

    }

  } catch (error) {
    console.error('Erro ao verificar atividade do usuário:', error);
  }

}

client.once('ready', () => setInterval(checkUserActivity, Number(process.env.TIMEOUT)));

client.login(process.env.BOT_TOKEN);