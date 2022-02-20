const path = require('path');

module.exports.NAME = 'Crystal Client Launcher';
module.exports.VERSION = require(path.join(__dirname, '../package.json')).version;
module.exports.LIBRARIES_ROOT_URL = 'https://libraries.crystalclient.net';
module.exports.ICON = (() => {
    let ext;
    switch (process.platform) {
        case 'win32':
            ext = 'png'
            break
        case 'darwin':
            ext = 'icns';
            break;
        default:
            ext = 'png'
            break
    }

    return path.join(__dirname, 'ui', 'images', `icon.${ext}`)
})();