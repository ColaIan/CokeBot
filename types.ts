import type {
  ChatInputCommandInteraction,
  InteractionResponse,
  SharedSlashCommand,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export interface BotModule {
  commands: {
    [command: string]: {
      data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
      execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    };
  };
}
