const os = require('os');
const got = require('got');
const JavaBuild = require('../objects/javaBuild');

/**
 * Get the current architecture.
 * @returns {(string,number)[]} The current architecture.
 */
function getArchitecture() {
    const arch = process.arch;
    switch (arch) {
        case 'x64':
        case 'ia32':
            return ['x86', 64];
        case 'x32':
            return ['x86', 32];
        case 'arm':
        case 'arm64':
            return ['arm', arch === 'arm64' ? 64 : 32];

        default:
            return ['x86', 32];
    }
}

/**
 * Get the current platform.
 * @returns {string} The current platform.
 */
function getPlatform() {
    const platform = os.platform();
    switch (platform) {
        case 'win32':
            return 'windows';
        case 'darwin':
            return 'macos';
        default:
            return 'linux';
    }
}

/**
 * Get the latest Azul Zulu JRE version for current platform and architecture.
 *
 * @param javaVersion The major version of the desired JRE.
 * @return {string} The generated download link.
 */
function buildJavaDownload(javaVersion) {
    const arch = getArchitecture();
    const platform = getPlatform();
    return [
        'https://api.azul.com/zulu/download/community/v1.0/bundles/',
        `?java_version=${javaVersion}`,
        `&os=${platform}`,
        `&arch=${arch[0]}`,
        `&hw_bitness=${arch[1]}`,
        `&ext=${platform === 'windows' ? 'zip' : 'tar.gz'}`,
        `&javafx=true`,
        `&release_status=ga`,
        `&features=fx`,
        `&latest=true`,
        `&bundle_type=jre`
    ].join('');
}

/**
 * Get the latest Azul Zulu JRE version for current platform and architecture.
 *
 * @param javaVersion The major version of the desired JRE.
 * @return {Promise<JavaBuild>} The generated download link.
 */
async function getLatestJavaBuild(javaVersion) {
    const url = buildJavaDownload(javaVersion);

    const response = await got(url, {
        json: true,
        method: 'GET'
    });
    const data = response.body;

    // The latest filtered version given by the Zulu API.
    const build = data[data.length - 1];

    const bundleResponse = await got(`https://api.azul.com/zulu/download/community/v1.0/bundles/${build.id}`, {
        json: true,
        method: 'GET'
    });
    const bundle = bundleResponse.body;

    // data from the build
    const ext = build.name.endsWith('.tar.gz') ? '.tar.gz' : '.zip';
    const name = build.name.substr(0, build.name.length - ext.length);
    const download = build.url;
    const majorVersion = javaVersion;
    const size = bundle.size;
    const id = build.id;

    // return the JavaBuild
    return new JavaBuild(name, ext, download, majorVersion, size, id);
}

module.exports = getLatestJavaBuild;