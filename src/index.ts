import 'dotenv/config';
import { Client, GatewayIntentBits, TextChannel, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      USER_ID: string;
      CHANNEL: string;
      TIMEOUT: string;
      CLIENT_ID: string;
      GUILD_ID: string;
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

let usedMessages: string[] = [];

// Função para carregar o lastMessageTimestamp de um arquivo
function loadLastMessageTimestamp(file: string): number {
  try {
    const data = readFileSync(resolve(file), 'utf-8');
    const parsedData = JSON.parse(data);
    return parsedData.lastMessageTimestamp || 0;
  } catch (error) {
    console.error(`Erro ao carregar o arquivo ${resolve(file)}:`, error);
    return 0; // Valor padrão se não houver arquivo ou ocorrer um erro
  }
}

// Função para salvar o lastMessageTimestamp em um arquivo
function saveLastMessageTimestamp(file: string, timestamp: number): void {
  try {
    writeFileSync(resolve(file), JSON.stringify({ lastMessageTimestamp: timestamp }));
  } catch (error) {
    console.error(`Erro ao salvar o arquivo ${resolve(file)}:`, error);
  }
}

function loadJSON(file: string) {
  try {
    const data = readFileSync(resolve(file), 'utf-8');
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error(`Erro ao carregar o arquivo ${resolve(file)}:`, error);
    return null;
  }
}

function saveJSON(file: string, data: any): void {
  try {
    writeFileSync(resolve(file), JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Erro ao salvar o arquivo ${resolve(file)}:`, error);
  }
}

function getRandomMessage() {
  const messages = loadJSON('./assets/messages.json') as string[];
  const availableMessages = messages.filter((msg: string) => !usedMessages.includes(msg));

  if (availableMessages.length === 0) usedMessages = [];

  const randomMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
  usedMessages.push(randomMessage);

  saveJSON('./assets/usedMessages.json', usedMessages);

  return randomMessage;
}

async function checkUserActivity() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const member = await guild.members.fetch(targetUserId);
    if (!member) return;

    const activities = loadJSON('./assets/activity.json');
    if (!activities) return;

    const userActivities = member.presence?.activities || [];
    const isPerformingActivity = userActivities.some(activity => activities.includes(activity.name));

    const currentTime = Date.now();
    const lastMessageTimestamp = loadLastMessageTimestamp('./assets/lastMessageTimestamp.json');

    if (isPerformingActivity && currentTime - lastMessageTimestamp >= cooldownPeriod) {
      // Atualiza o timestamp e salva no arquivo
      saveLastMessageTimestamp('./assets/lastMessageTimestamp.json', currentTime);

      const channel = await client.channels.fetch(targetChannelId) as TextChannel;
      if (channel) {
        const message = getRandomMessage();
        if (message) channel.send(message);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar atividade do usuário:', error);
  }
}

// Comandos para /learn e /dictionary
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  if (commandName === 'learn') {
    const newMessage = interaction.options.getString('message');

    if (newMessage) {
      const messages = loadJSON('./assets/messages.json') || [];
      messages.push(newMessage);
      saveJSON('./assets/messages.json', messages);

      await interaction.reply(`Nova mensagem aprendida: "${newMessage}"`);
    } else {
      await interaction.reply('Por favor, forneça uma mensagem válida.');
    }
  }

  if (commandName === 'dictionary') {
    const messages = loadJSON('./assets/messages.json') || [];

    if (messages.length > 0) {
      await interaction.reply(`Aqui esta tudo que eu sei:\n${messages.join('\n')}`);
    } else {
      await interaction.reply('Ainda não aprendi nenhuma mensagem.');
    }
  }
});

// Registro dos comandos
const commands = [
  new SlashCommandBuilder()
    .setName('learn')
    .setDescription('Ensina ao bot uma nova mensagem.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('A mensagem para ensinar')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('dictionary')
    .setDescription('Exibe todas as mensagens que o bot conhece.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Atualizando comandos de aplicação (/)...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos de aplicação:', error);
  }
})();

client.once('ready', () => setInterval(checkUserActivity, Number(process.env.TIMEOUT)));

client.login(process.env.BOT_TOKEN);
