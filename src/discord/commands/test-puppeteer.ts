
import Apify from 'apify';
import { Command } from '.';
import fs from 'fs';

async function onMessage(msg){
    let name;
    const handleException = e => {
        console.log('Exception: ', e)
        if (typeof e === 'string') {
            msg.reply('Exception: ' + e);
        } else if (typeof e === 'object' && typeof e.toString === 'function'){
            msg.reply('Exception: ' + e.toString());
        } else {
            msg.reply('Caught Exception..');
        }
    }
    const takeScreenshot = async (page, message) => {
        await page.screenshot({path: 'clan.png'});
        await msg.reply(message, {files: ['./clan.png']});
        fs.unlinkSync('./clan.png');
    }

    try{
        await (async () => {

            try {

                msg.reply('Launching...');
                const browser = await Apify.launchPuppeteer({
                    launchOptions: {
                        headless: true,
                        args: ['--no-sandbox']
                    }
                });
                msg.reply('Loading faforever.com');
                const page = await browser.newPage();
                await page.goto('https://faforever.com/login');
                msg.reply('Loaded. Now entering login details');
                const usernameEl = await page.$('#usernameOrEmail');
                if (!usernameEl) {
                    throw "Can't find username field."
                }
                await usernameEl.type(process.env.FAF_CLAN_USERNAME);
                const passwordEl = await page.$('#password');
                if (!passwordEl) {
                    throw "Can't find password field."
                }
                await passwordEl.type(process.env.FAF_CLAN_PASSWORD);
                await takeScreenshot(page, 'Details entered into login form: ');
                await passwordEl.press('Enter');
                await page.waitForNavigation();
                await takeScreenshot(page, 'Logged in: ');
                let url = page.url();
                if (url.indexOf('oauth2/consent') !== -1) {
                    const submitBtn = await page.$('#confirmation-form input[type="submit"]');
                    await submitBtn.click()
                    await page.waitForNavigation();
                    await takeScreenshot(page, 'Authorising FAF to account');
                }
                // Get cookies
                const cookies = await page.cookies('https://hydra.faforever.com', 'https://user.faforever.com');

                // Use cookies in other tab or browser
                const page2 = await browser.newPage();
                if (!page2) {
                    await msg.reply('Error: couldn\'t load clan manage page');
                    return;
                }
                await page2.setCookie(...cookies);
                await page2.goto('https://www.faforever.com/clans/manage'); // Opens page as logged user
                await takeScreenshot(page, 'Clan management page: ');
                const clanUserEl = await page2.$('[name="invited_player"]');
                if (!clanUserEl) {
                    await msg.reply('Error: couldn\'t load find invite field');
                    return;
                }
                await takeScreenshot(page, 'Clan management page: ');
                await clanUserEl.type(name);
                await takeScreenshot(page, 'Enter username: ');
                await clanUserEl.press('Enter');
                await page2.waitForNavigation();
                await takeScreenshot(page, 'Done? ');
                await browser.close();
            }catch (e) {
                handleException(e)
            }
        })();
    } catch (e) {
        handleException(e)
    }
}

const out: Command = {
    name: 'test-puppeteer',
    description: 'Generate a clan invite link.',
    help: 'Test puppeteer is working (used for clan invites)',
    check: content => content.match(/^puppeteer/),
    run: onMessage
}

export default out;