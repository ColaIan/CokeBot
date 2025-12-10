import {
  QueueRepeatMode,
  useMainPlayer,
  useQueue,
  useTimeline,
} from "discord-player";
import {
  GuildMember,
  InteractionContextType,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import type { BotModule } from "../types";

export default {
  commands: {
    play: {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setName("play") // Command name
        .setDescription("Play a song in a voice channel") // Command description
        .addStringOption(
          (option) =>
            option
              .setName("song") // Option name
              .setDescription("The song to play") // Option description
              .setRequired(true) // Make the option required
        ),
      execute: async (interaction) => {
        const player = useMainPlayer();
        const query = interaction.options.getString("song", true);
        const voiceChannel = (interaction.member as GuildMember).voice.channel;

        if (!voiceChannel) {
          return interaction.reply(
            "You need to be in a voice channel to play music!"
          );
        }

        if (
          interaction.guild!.members.me!.voice.channel &&
          interaction.guild!.members.me!.voice.channel !== voiceChannel
        ) {
          return interaction.reply(
            "I am already playing in a different voice channel!"
          );
        }

        if (
          !voiceChannel
            .permissionsFor(interaction.guild!.members.me!)
            .has(PermissionsBitField.Flags.Connect)
        ) {
          return interaction.reply(
            "I do not have permission to join your voice channel!"
          );
        }

        if (
          !voiceChannel
            .permissionsFor(interaction.guild!.members.me!)
            .has(PermissionsBitField.Flags.Speak)
        ) {
          return interaction.reply(
            "I do not have permission to speak in your voice channel!"
          );
        }

        try {
          // Play the song in the voice channel
          const result = await player.play(voiceChannel, query, {
            nodeOptions: {
              metadata: { channel: interaction.channel }, // Store text channel as metadata on the queue
            },
          });

          // Reply to the user that the song has been added to the queue
          return interaction.reply(
            `${result.track.title} has been added to the queue!`
          );
        } catch (error) {
          // Handle any errors that occur
          console.error(error);
          return interaction.reply("An error occurred while playing the song!");
        }
      },
    },
    "now-playing": {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDescription("Display the currently playing song"),
      execute: async (interaction) => {
        // Get the current queue
        const queue = useQueue();

        if (!queue) {
          return interaction.reply(
            "This server does not have an active player session."
          );
        }

        // Get the currently playing song
        const currentSong = queue.currentTrack;

        // Check if there is a song playing
        if (!currentSong) {
          return interaction.reply("No song is currently playing.");
        }

        // Send the currently playing song information
        return interaction.reply(`Now playing: ${currentSong.title}`);
      },
    },
    pause: {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDescription("Pause the currently playing song"),
      execute: async (interaction) => {
        // Get the queue's timeline
        const timeline = useTimeline();

        if (!timeline) {
          return interaction.reply(
            "This server does not have an active player session."
          );
        }

        // Invert the pause state
        const wasPaused = timeline.paused;

        wasPaused ? timeline.resume() : timeline.pause();

        // If the timeline was previously paused, the queue is now back to playing
        return interaction.reply(
          `The player is now ${wasPaused ? "playing" : "paused"}.`
        );
      },
    },
    skip: {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDescription("Skip the currently playing song"),
      execute: async (interaction) => {
        // Get the current queue
        const queue = useQueue();

        if (!queue) {
          return interaction.reply(
            "This server does not have an active player session."
          );
        }

        if (!queue.isPlaying()) {
          return interaction.reply("There is no track playing.");
        }

        // Skip the current track
        queue.node.skip();

        // Send a confirmation message
        return interaction.reply("The current song has been skipped.");
      },
    },
    shuffle: {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDescription("Shuffle the tracks in the queue"),
      execute: async (interaction) => {
        // Get the current queue
        const queue = useQueue();

        if (!queue) {
          return interaction.reply(
            "This server does not have an active player session."
          );
        }

        // Check if there are enough tracks in the queue
        if (queue.tracks.size < 2)
          return interaction.reply(
            "There are not enough tracks in the queue to shuffle."
          );

        // Shuffle the tracks in the queue
        queue.tracks.shuffle();

        // Send a confirmation message
        return interaction.reply(`Shuffled ${queue.tracks.size} tracks.`);
      },
    },
    loop: {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDescription("Loop the queue in different modes")
        .addNumberOption((option) =>
          option
            .setName("mode") // Option name
            .setDescription("The loop mode") // Option description
            .setRequired(true) // Option is required
            .addChoices(
              {
                name: "Off",
                value: QueueRepeatMode.OFF,
              },
              {
                name: "Track",
                value: QueueRepeatMode.TRACK,
              },
              {
                name: "Queue",
                value: QueueRepeatMode.QUEUE,
              },
              {
                name: "Autoplay",
                value: QueueRepeatMode.AUTOPLAY,
              }
            )
        ),
      execute: async (interaction) => {
        // Get the current queue
        const queue = useQueue();

        if (!queue) {
          return interaction.reply(
            "This server does not have an active player session."
          );
        }

        // Get the loop mode
        const loopMode = interaction.options.getNumber(
          "mode",
          true
        ) as QueueRepeatMode;

        // Set the loop mode
        queue.setRepeatMode(loopMode);

        // Send a confirmation message
        return interaction.reply(
          `Loop mode set to ${(QueueRepeatMode as any)[loopMode]}`
        );
      },
    },
    queue: {
      data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDescription("Display the current queue"),
      execute: async (interaction) => {
        // Get the current queue
        const queue = useQueue();

        if (!queue) {
          return interaction.reply(
            "This server does not have an active player session."
          );
        }

        // Get the current track
        const currentTrack = queue.currentTrack;

        if (!currentTrack) {
          return interaction.reply("No track is currently playing.");
        }

        // Get the upcoming tracks
        const upcomingTracks = queue.tracks.toArray().slice(0, 5);

        // Create a message with the current track and upcoming tracks
        const message = [
          `**Now Playing:** ${currentTrack.title} - ${currentTrack.author}`,
          "",
          "**Upcoming Tracks:**",
          ...upcomingTracks.map(
            (track, index) => `${index + 1}. ${track.title} - ${track.author}`
          ),
        ].join("\n");

        // Send the message
        return interaction.reply(message);
      },
    },
  },
} satisfies BotModule;
