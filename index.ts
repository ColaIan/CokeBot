import { Client, Events, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.GuildMembers] });

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id === "667714189254459414" && !member.user.bot) {
    member.roles.add([
      "810082644636860451",
      "810082644623622212",
      "810082644623622205",
    ]);
  }
});

client.login(process.env.TOKEN);
