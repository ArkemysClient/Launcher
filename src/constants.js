const path = require('path');

module.exports.NAME = 'Arkemys Client';
module.exports.VERSION = require(path.join(__dirname, '../package.json')).version;
module.exports.LIBRARIES_ROOT_URL = 'https://arkemys.tk/cdn/libraries';
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