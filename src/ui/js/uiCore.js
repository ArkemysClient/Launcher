// imports
const $ = require('jquery');
const got = require('got');
const remote = require('@electron/remote');
const configHandler = require('../handler/configHandler');
const mc = require('minecraft-server-util');

const {shell} = require('electron');
const {webFrame} = require('electron');

const {Logger} = require('../util/logger');
const ProcessHandler = require('../handler/processHandler');

// initialize the ui core
let logger = new Logger('UI Core', 'blue');
/** @type {import("../../handler/processHandler")} */
let processHandler = new ProcessHandler(configHandler);
logger.info('Initializing UI Core...');

let launchButton;

// remove eval function
window.eval = global.eval = () => {
    throw new Error('window.eval() is not supported.');
};

// log deprecation and process warnings
process.traceProcessWarnings = true;
process.traceDeprecation = true;

// required for macos
webFrame.setZoomLevel(0);
webFrame.setVisualZoomLevelLimits(1, 1);

// all web links from href tags should open on the user's default browser
$(document).on('click', 'a[href^="http"]', function (event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

// adds devtool support
document.addEventListener('keydown', event => {
    if ((event.key === 'I' || event.key === 'i') && event.ctrlKey && event.shiftKey) {
        let window = remote.getCurrentWindow();
        window.toggleDevTools();
    }
});

// add global button listeners
document.addEventListener('readystatechange', async () => {
    if (document.readyState !== 'interactive')
        return;

    // disables the ability to tab to different elements of the app.
    document.onkeydown = ev => ev.key !== 'Tab';

    document.getElementById('btnClose').addEventListener('click', () => {
        if (processHandler.activeProcess)
            remote.getCurrentWindow().hide();
        else
            remote.getCurrentWindow().close();

        saveConfigElements();
        configHandler.saveConfig();
    });

    document.getElementById('btnMinimize').addEventListener('click', () => {
        remote.getCurrentWindow().minimize();
        document.activeElement.blur();
    });

    document.getElementById('btnStore').addEventListener('click', () => {
        shell.openExternal('https://store.crystalclient.net/');
    });

    launchButton = document.getElementById('btnLaunch');
    resetLaunchButtonText();
    enableLaunchButton();
    launchButton.addEventListener('click', () => {
        if (launchButton.enabled) {
            launchButton.enabled = false;
            processHandler.launch();
        }
    });

    const navButtons = ['btnHome', 'btnSettings', 'btnPartners', 'btnAbout'];

    document.getElementById('btnHome').classList.add('selected');
    document.getElementById('btnHome').addEventListener('click', () => {
        switchView(view.LANDING);

        navButtons.forEach(b => document.getElementById(b).classList.remove('selected'));
        document.getElementById('btnHome').classList.add('selected');
    });

    document.getElementById('btnSettings').addEventListener('click', () => {
        switchView(view.SETTINGS);

        navButtons.forEach(b => document.getElementById(b).classList.remove('selected'));
        document.getElementById('btnSettings').classList.add('selected');
    });

    document.getElementById('btnPartners').addEventListener('click', () => {
        switchView(view.PARTNERS);

        navButtons.forEach(b => document.getElementById(b).classList.remove('selected'));
        document.getElementById('btnPartners').classList.add('selected');
    });

    document.getElementById('btnAbout').addEventListener('click', () => {
        switchView(view.ABOUT);

        navButtons.forEach(b => document.getElementById(b).classList.remove('selected'));
        document.getElementById('btnAbout').classList.add('selected');
    });

    // load partners & news
    let resp;

    resp = await got("https://libraries.crystaldev.co/partners.json", {json: true});
    for (const partner of resp.body.partners) {
        $("#footerContainer #servers").append(
            `
                <a href="${partner.url}" data-balloon-length="medium" aria-label="${partner.ip}" data-balloon-pos="up" draggable="false">
                    <div class="rounded-full p-2">
                        <img src="${partner.logo}" alt="${partner.name}" class="w-12" draggable="false">
                        <span class="h-3 w-3 hidden"></span>
                    </div>
                </a>
                `
        );

        let status = null;


        try {
            status = await mc.status(partner.ip, 25565, {
                timeout: 5000,
                enableSRV: true
            });
        }
        catch (err) {
            logger.error(`Unable to get status for partner ${partner.name}`);
        }
        finally {
            $(".partnersList").append(
                `
                    <div class="partner">
                        <div class="partnerInfo">
                            <img class="partnerIcon" src="${partner.logo}" alt="${partner.name}" draggable="false">
                            <div class="partnerText">
                                <div class="partnerName">${partner.name}</div>
                                <div class="partnerDesc">${status ? status.version.name : 'Unable to retrieve server status'}</div>
                            </div>
                        </div>
                        <div class="partnerIP">${partner.ip}</div>
                    </div>
            `
            );

            if (partner !== resp.body.partners[resp.body.partners.length - 1])
                $(".partnersList").append(`<hr class="partnerDivider">`);
        }
    }

    resp = await got("https://libraries.crystaldev.co/news.json", {json: true});
    for (const n of resp.body.news) {
        $("#newsContainer").append(
            `<div class="w-80 rounded-lg" id="article">
                <div class="articleImage">
                    <img src="${n.image}" id="articleImage" class="rounded-t-lg">
                </div>
                <div class="articleInfo">

                    <div class="articleText">
                        <h>${n.title}</h>
                        <p>${n.content}</p>
                    </div>
                    <div id="articleFooter">
                        <div class="articleAuthor">
                            <img id="authorSkin" draggable="false" src="https://crafatar.com/avatars/${n.uuid}">
                            <p id="authorIgn" draggable="false">${n.ign}</p>
                        </div>
                        <a id="btnReadMore" href="${n.url}" draggable="false"><button>Read More</button></a>
                    </div>
                </div>
            </div>`
        )
    }

    setConfigElements();
    bindFileSelectors();

    // fade into the main ui from loading screen
    setTimeout(() => {
        $('#loadingContainer').fadeOut(500, () => {
            $('#loadingLogoImg').removeClass('pulsating')
        });
    }, 250);
});

function bindFileSelectors() {
    let element = document.getElementsByClassName('btnChooseFile')[0];
    element.onclick = async event => {
        const options = {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Minecraft Directory'
        };

        const res = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), options);
        if (!res.canceled) {
            element.previousElementSibling.value = res.filePaths[0];
            if (element.hasAttribute('configProp')) {
                configHandler.getConfig().setElement(null, element.getAttribute('configProp'), res.filePaths[0]);
                configHandler.saveConfig();
            }
        }
    }
}

function setConfigElements() {
    const conf = configHandler.getConfig();
    for (const element of document.getElementsByTagName('*')) {
        if (element.hasAttribute('configProp')) {
            if (element.id === 'inputMemory') {
                element.min = configHandler.getMinMemory();
                element.max = configHandler.getMaxMemory();
                element.value = conf.java.memory.toString();
                document.getElementById('memoryLabel').innerText = element.value + 'MB';
                element.oninput = event => {
                    document.getElementById('memoryLabel').innerText = event.target.value + 'MB';
                    configHandler.getConfig().java.memory = Number(event.target.value);
                    configHandler.saveConfig();
                };
            }
            else if (element.type === 'checkbox') {
                element.checked = conf.getElement(conf, element.getAttribute('configProp'));
            }
            else
                element.value = conf.getElement(conf, element.getAttribute('configProp'));
        }
    }
}

function saveConfigElements() {
    for (const element of document.getElementsByTagName('*')) {
        if (element.hasAttribute('configProp')) {
            if (element.type === 'checkbox')
                configHandler.getConfig().setElement(null, element.getAttribute('configProp'), element.checked);
            else
                configHandler.getConfig().setElement(null, element.getAttribute('configProp'), element.value);
        }
    }
}

function enableLaunchButton() {
    launchButton.enabled = true;
}

function disableLaunchButton() {
    launchButton.enabled = false;
}

function resetLaunchButtonText() {
    setLaunchButtonText(`Launch ${configHandler.getCurrentVersion(true)}`);
}

function setLaunchButtonText(text) {
    launchButton.textContent = text;
}

function showLaunchFailure(title, desc) {
    setOverlayContent(
        title,
        desc,
        'Dismiss'
    );
    setOverlayHandler(null);
    toggleOverlay(true);
}

logger.info('UI Core initialized.');

// exports
module.exports = {
    configHandler
};