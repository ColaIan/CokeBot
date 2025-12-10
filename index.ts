import {
  GuildQueueEvent,
  Player,
  QueueRepeatMode,
  useMainPlayer,
} from "discord-player";
import { SoundcloudExtractor } from "discord-player-soundcloud";
import { SpotifyExtractor } from "discord-player-spotify";
import {
  ChatInputCommandInteraction,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import { readdirSync } from "fs";
import path from "path";
import type { BotModule } from "./types";

// Register modules
const commands = new Collection<string, BotModule["commands"][string]>();
const foldersPath = path.join(__dirname, "modules");
const modulePaths = readdirSync(foldersPath);
for (const file of modulePaths) {
  const modulePath = path.join(foldersPath, file);
  const modulePaths = file.endsWith(".ts")
    ? [modulePath]
    : readdirSync(modulePath)
        .filter((file) => file.endsWith(".ts"))
        .map((f) => path.join(file, f));
  for (const modulePath of modulePaths) {
    const module = require(modulePath).default as BotModule;
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if (
      "commands" in module &&
      typeof module.commands === "object" &&
      !Array.isArray(module.commands)
    ) {
      for (const [key, command] of Object.entries(module.commands)) {
        if ("data" in command && "execute" in command) {
          command.data.setName(key);
          commands.set(command.data.name, command);
        } else {
          console.log(
            `[WARNING] Command ${key} at ${modulePath} is missing a required "data" or "execute" property.`
          );
        }
      }
    } else {
      console.log(
        `[WARNING] The module at ${modulePath} is missing a required "commands" property.`
      );
    }
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const rest = new REST().setToken(process.env.TOKEN!);

client.on(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
  try {
    console.log(
      `Started refreshing ${commands.size} application (/) commands.`
    );
    // The put method is used to fully refresh all commands with the current set
    const data = (await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      {
        body: commands
          .values()
          .map((x) => x.data.toJSON())
          .toArray(),
      }
    )) as any[];
    console.log(
      `Successfully refreshed ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
});
client.on(Events.Error, console.error);

client.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id === "667714189254459414" && !member.user.bot) {
    member.roles.add([
      "810082644636860451",
      "810082644623622212",
      "810082644623622205",
    ]);
  }
});

const player = new Player(client);
await player.extractors.loadMulti([SoundcloudExtractor, SpotifyExtractor], {});
player.events.on(GuildQueueEvent.PlayerError, async (queue, error) => {
  await queue.metadata.channel?.send(`Error: ${error.message}`);
});
player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
  await queue.metadata.channel?.send(`Now playing **${track.cleanTitle}**!`);
});
player.events.on(GuildQueueEvent.PlayerFinish, async (queue, track) => {
  if (queue.repeatMode === QueueRepeatMode.OFF && queue.isEmpty())
    await queue.metadata.channel?.send(
      `Queue is empty, leaving the voice channel.`
    );
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    !((interaction: Interaction): interaction is ChatInputCommandInteraction =>
      interaction.isChatInputCommand())(interaction)
  )
    return;
  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await interaction.deferReply();
    if (interaction.guild)
      await useMainPlayer().context.provide({ guild: interaction.guild }, () =>
        command.execute(interaction)
      );
    else command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

client.login(process.env.TOKEN);
