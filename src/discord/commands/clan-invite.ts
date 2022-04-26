
import Apify from 'apify';
import { Client, Guild, MessagePayload, InteractionReplyOptions } from 'discord.js';
import { Command } from '.';

async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>, content: string){
    // TODO make it work for multiple clans..
    // right now the username and password of the clan leader must be stored in the .env.
    // It could potentially be stored in the DB but with decent encryption. Not sure about that..
    let name;
    try{
        await send("Clan invite need to be generated manually now. <@401536987326185472> will generate you one.")
        return;
        const name_result = content.match(/^f\/clan(.+)/) as RegExpExecArray;
        if (name_result && name_result[1]) {
            name = name_result[1].trim();
            await (async () => {

                const browser = await Apify.launchPuppeteer({
                    launchOptions: {
                        headless: true,
                        args: ['--no-sandbox']
                    }
                });
                const page = await browser.newPage();
                await page.goto('https://faforever.com/login');
                const usernameEl = await page.$('#username');
                await usernameEl.type(process.env.FAF_CLAN_USERNAME);
                const passwordEl = await page.$('#password');
                await passwordEl.type(process.env.FAF_CLAN_PASSWORD);
                await passwordEl.press('Enter');
                await page.waitForNavigation();

                // Get cookies
                const cookies = await page.cookies();

                // Use cookies in other tab or browser
                const page2 = await browser.newPage();
                await page2.setCookie(...cookies);
                await page2.goto('https://www.faforever.com/clans/manage'); // Opens page as logged user

                const clanUserEl = await page2.$('[name="invited_player"]');
                await clanUserEl.type(name);
                await clanUserEl.press('Enter');
                await page2.waitForNavigation();
                const url = page2.url();

                let failed = true;
                if (url.indexOf('invitation') !== -1) {
                    const invitation_id = url.match(/invitation_id=(.+)/)
                    if (invitation_id && invitation_id[1]) {
                        await send(`Here's your invite link. Click it and let us know when you've done it so we can assign your @ANZFAF Clan role. https://www.faforever.com/clans/accept?i=${invitation_id[1]}`);
                        failed = false
                    }
                }
                if (failed) {
                    await send('There was a problem generating an invite for `' + name + '` please check that username is correct, otherwise maybe @antz needs to generate one manually.')
                }

                await browser.close();
            })();
        }
    } catch (e) {
        console.log('clan error', {
            name,
            author: client.user?.id ?? '',
            guild: guild.id
        }, e)
    }
}

const out: Command = {
    name: 'clan',
    description: 'Generate a clan invite link.',
    help: 'This will generate a clan invite link for you. \nUsage: `f/clan username`',
    check: content => content.match(/^clan(.+)/),
    run: onMessage
}

export default out;