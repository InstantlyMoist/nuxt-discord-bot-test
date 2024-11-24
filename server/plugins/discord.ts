import { Client, Events, GatewayIntentBits, Collection } from "discord.js"
import { REST, Routes } from 'discord.js'
import fs from "fs"

interface ExtendedClient extends Client {
    commands: Collection<string, any>
}

export default defineNitroPlugin(async (nitroApp) => {
    const client = new Client({ intents: GatewayIntentBits.Guilds }) as ExtendedClient

    const commands: any = []
    client.commands = new Collection()

    const commandFiles = fs.readdirSync("./server/discord").filter((file) => file.endsWith(".js"))

    for (const file of commandFiles) {
        await import(`../../server/discord/${file}`).then((module) => {
            const command = module.default
            commands.push(command.data.toJSON())
            client.commands.set(command.data.name, command)
        });
    }

    client.on(Events.ClientReady, async () => {
        console.log(`Logged in as ${client.user?.tag}`)

        const rest = new REST().setToken(useRuntimeConfig().discordToken);

        try {
            await rest.put(
                Routes.applicationGuildCommands(useRuntimeConfig().discordClientId, useRuntimeConfig().discordGuildId),
                { body: commands },
            );
        } catch (error) {
            console.error(error)
        }
    })

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isCommand()) return

        const { commandName } = interaction

        const command = client.commands.get(commandName)

        if (!command) return

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error)
            await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true })
        }
    });

    client.login(useRuntimeConfig().discordToken)
})