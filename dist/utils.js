"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const { createHash } = require("crypto");
const crypto = __importStar(require("crypto"));
const { generateKeyPair } = require("crypto");
const createSign = require("crypto").createSign;
const createVerify = require("crypto").createVerify;
const requestLib = require("request");
const showdown = __importStar(require("showdown"));
const sanitizeHtml = require("sanitize-html");
const sharp = require("sharp");
exports.config = {};
let configFile = "config.json";
function loadConfig(file) {
    if (file)
        configFile = file;
    console.log("Loading config", configFile);
    fs_1.readFile(configFile, "UTF-8", (err, data) => {
        exports.config = JSON.parse(data);
        exports.generateTestData = !!exports.config.generateTestData;
        exports.migrationNumber = exports.config.migrationNumber || 0;
        resolveConfigLoad();
    });
}
exports.loadConfig = loadConfig;
let resolveConfigLoad;
exports.configLoaded = new Promise((resolve, reject) => {
    resolveConfigLoad = resolve;
});
const mails = __importStar(require("./mails"));
const sms = __importStar(require("./sms"));
function port() {
    return exports.config.port == undefined ? 9090 : exports.config.port == "" ? "" : exports.config.port;
}
exports.port = port;
function realPort() {
    return exports.config.realPort == undefined ? 9090 : exports.config.realPort == "" ? "" : exports.config.realPort;
}
exports.realPort = realPort;
function protocol() {
    return exports.config.protocol || "http";
}
exports.protocol = protocol;
function host() {
    return exports.config.host || "0.0.0.0";
}
exports.host = host;
exports.generateTestData = !!exports.config.generateTestData;
exports.migrationNumber = exports.config.migrationNumber || 0;
function saveConfig() {
    setTimeout(() => {
        fs_1.writeFile(configFile, JSON.stringify(exports.config, undefined, 4), "UTF-8", () => { });
    }, 0);
}
function alertLog(logType, content) {
    if (exports.config.logs && exports.config.logs[logType]) {
        if (exports.config.logs[logType].email)
            mails.sendAdminAlert(content);
        if (exports.config.logs[logType].sms)
            sms.sendToAdmin(content);
    }
}
exports.alertLog = alertLog;
function getServerName() { return exports.config.serverName || "default server name"; }
exports.getServerName = getServerName;
function setServerName(name) {
    exports.config.serverName = name;
    saveConfig();
}
exports.setServerName = setServerName;
function setMigrationNumber(n) {
    console.log("Migration number", exports.migrationNumber, "->", n);
    exports.migrationNumber = n;
    exports.config.migrationNumber = exports.migrationNumber;
    saveConfig();
}
exports.setMigrationNumber = setMigrationNumber;
function getAdmins() { return exports.config.admins || []; }
exports.getAdmins = getAdmins;
function setAdmins(names) {
    exports.config.admins = names;
    saveConfig();
}
exports.setAdmins = setAdmins;
function getBlockNewInstances() { return exports.config.blockNewInstances == undefined ? false : exports.config.blockNewInstances; }
exports.getBlockNewInstances = getBlockNewInstances;
function setBlockNewInstances(block) {
    exports.config.blockNewInstances = block;
    saveConfig();
}
exports.setBlockNewInstances = setBlockNewInstances;
function getAcceptSignUp() { return exports.config.acceptSignUp == undefined ? true : exports.config.acceptSignUp; }
exports.getAcceptSignUp = getAcceptSignUp;
function setAcceptSignUp(accept) {
    exports.config.acceptSignUp = accept;
    saveConfig();
}
exports.setAcceptSignUp = setAcceptSignUp;
function getHeadHTML() { return exports.config.headHTML || ""; }
exports.getHeadHTML = getHeadHTML;
function setHeadHTML(html) {
    exports.config.headHTML = html;
    saveConfig();
}
exports.setHeadHTML = setHeadHTML;
function getFooterHTML() { return exports.config.footerHTML || ""; }
exports.getFooterHTML = getFooterHTML;
function setFooterHTML(html) {
    exports.config.footerHTML = html;
    saveConfig();
}
exports.setFooterHTML = setFooterHTML;
function getCustomCSS() { return exports.config.customCSS || ""; }
exports.getCustomCSS = getCustomCSS;
function setCustomCSS(css) {
    exports.config.customCSS = css;
    saveConfig();
}
exports.setCustomCSS = setCustomCSS;
function getOverviewBranches() {
    return exports.config.overviewBranches;
}
exports.getOverviewBranches = getOverviewBranches;
function setOverviewBranches(ob) {
    exports.config.overviewBranches = ob;
    saveConfig();
}
exports.setOverviewBranches = setOverviewBranches;
function getOverviewHasThreads() { return exports.config.overviewHasThreads == undefined ? true : exports.config.overviewHasThreads; }
exports.getOverviewHasThreads = getOverviewHasThreads;
function setOverviewHasThreads(accept) {
    exports.config.overviewHasThreads = accept;
    saveConfig();
}
exports.setOverviewHasThreads = setOverviewHasThreads;
function serverAddress() {
    return host() + (port() ? (":" + port()) : "");
}
exports.serverAddress = serverAddress;
function baseUrl() {
    return protocol() + "://" + serverAddress();
}
exports.baseUrl = baseUrl;
const njk = __importStar(require("nunjucks"));
njk.configure("src", { autoescape: true });
function urlForPath(path) {
    return baseUrl() + "/" + path;
}
exports.urlForPath = urlForPath;
function last(list) {
    return list[list.length - 1];
}
exports.last = last;
let logStream = fs_1.createWriteStream("log.txt", { flags: "a" });
function log(...args) {
    logStream.write(new Date().toISOString() + ": ");
    logStream.write(args.map(e => JSON.stringify(e)).join(" "));
    logStream.write("\n");
}
exports.log = log;
function generateUserKeyPair() {
    return new Promise((resolve, reject) => {
        generateKeyPair('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem',
            }
        }, (err, publicKey, privateKey) => {
            resolve({
                publicKey,
                privateKey
            });
        });
    });
}
exports.generateUserKeyPair = generateUserKeyPair;
function sha256(str) {
    return createHash("sha256").update(str, "utf8").digest("base64");
}
exports.sha256 = sha256;
function signString(key, content) {
    let sign = createSign("RSA-SHA256");
    sign.update(content);
    return sign.sign(key, "base64");
}
exports.signString = signString;
function verifyString(key, signature, content) {
    let verify = createVerify("RSA-SHA256");
    verify.update(content);
    return verify.verify(key, signature, "base64");
}
exports.verifyString = verifyString;
function endWithRedirect(res, url) {
    res.statusCode = 303;
    res.setHeader("Location", url);
    res.end();
}
exports.endWithRedirect = endWithRedirect;
function parseCookies(cookie) {
    return cookie.split(';').reduce(function (prev, curr) {
        var m = / *([^=]+)=(.*)/.exec(curr);
        var key = m[1];
        var value = decodeURIComponent(m[2]);
        prev[key] = value;
        return prev;
    }, {});
}
exports.parseCookies = parseCookies;
function stringifyCookies(cookies) {
    var list = [];
    for (var key in cookies) {
        list.push(key + '=' + encodeURIComponent(cookies[key]));
    }
    return list.join('; ');
}
exports.stringifyCookies = stringifyCookies;
function renderTemplate(templatePath, viewData) {
    return new Promise((res, rej) => {
        njk.render(templatePath, Object.assign({ serverName: getServerName(), acceptSignUp: getAcceptSignUp(), headHTML: getHeadHTML(), footerHTML: getFooterHTML(), customCSS: getCustomCSS(), utils: {
                encodeURIComponent: encodeURIComponent,
                threadLink: (id) => {
                    if (id.split("/")[2] == serverAddress())
                        return id;
                    else
                        return "/thread/" + encodeURIComponent(id);
                },
                renderMarkdown: renderMarkdown,
                renderRemoteHTML: renderRemoteHTML,
                renderUserName: (name) => {
                    if (name.indexOf("@" + serverAddress()) == -1)
                        return name;
                    else
                        return name.substr(0, name.indexOf("@" + host()));
                },
                renderRelativeTime: (date) => {
                    let days = (new Date().getTime() - date) / (1000 * 60 * 60 * 24);
                    days = Math.floor(days);
                    if (days > 1)
                        return days + " days ago";
                    else
                        return "one day ago";
                },
                isUrl: isUrl
            } }, viewData), (err, str) => {
            if (err) {
                console.log(err);
                rej(err);
            }
            else {
                res(str);
            }
        });
    });
}
exports.renderTemplate = renderTemplate;
function request(options) {
    return new Promise((resolve, reject) => {
        requestLib(options, (err, resp, body) => {
            if (err)
                reject(err);
            else
                resolve({ resp: resp, body: body });
        });
    });
}
exports.request = request;
var MediaType;
(function (MediaType) {
    MediaType["Image"] = "image";
    MediaType["Video"] = "video";
    MediaType["Iframe"] = "iframe";
})(MediaType = exports.MediaType || (exports.MediaType = {}));
function externalMediaToAttachment(media) {
    return {
        "type": "Document",
        "mediaType": "image/jpeg",
        "url": media.url,
        "name": null //,
        //"blurhash": "U66@vUtR0KMx0JRP?H%MJ8nPi_S}?HxuIoMx"
    };
}
exports.externalMediaToAttachment = externalMediaToAttachment;
function getUrlFromOpenGraph(url) {
    return new Promise((resolve, reject) => {
        requestLib.get(url, (err, resp, data) => {
            if (data) {
                if (resp.headers["content-type"] && resp.headers["content-type"].indexOf("image") != -1) {
                    resolve({ type: MediaType.Image,
                        url: url,
                        thumbnail: undefined
                    });
                    return;
                }
                let videoUrl = "";
                let imageUrl = "";
                let iframeUrl = "";
                data.split("<meta")
                    .map(s => s.split("/>")[0])
                    .map(s => {
                    let url = undefined;
                    try {
                        url = s.split('content="')[1].split('"')[0];
                    }
                    catch (e) { }
                    if (url) {
                        if (s.indexOf('property="og:video"') != -1) {
                            videoUrl = url;
                        }
                        else if (s.indexOf('property="og:video:url"') != -1) {
                            // since youtube has 2 og:video:url, which sucks, I take the one that I can embed
                            if (url.indexOf("youtube") == -1 || url.indexOf("embed") != -1)
                                iframeUrl = url;
                        }
                        else if (s.indexOf('property="og:image"') != -1) {
                            imageUrl = url;
                        }
                    }
                });
                data.split("<link")
                    .map(s => s.split("/>")[0])
                    .map(s => {
                    let url = undefined;
                    try {
                        url = s.split('href="')[1].split('"')[0];
                    }
                    catch (e) { }
                    if (url) {
                        if (s.indexOf('rel="image_src"') != -1) {
                            imageUrl = url;
                        }
                    }
                });
                if (videoUrl)
                    resolve({ type: MediaType.Video,
                        url: videoUrl,
                        thumbnail: undefined
                    });
                else if (iframeUrl)
                    resolve({ type: MediaType.Iframe,
                        url: iframeUrl,
                        thumbnail: undefined
                    });
                else if (imageUrl)
                    resolve({ type: MediaType.Image,
                        url: imageUrl,
                        thumbnail: undefined
                    });
            }
            else {
                reject();
            }
        });
    });
}
exports.getUrlFromOpenGraph = getUrlFromOpenGraph;
// from an image url download the image, resize it to a thumbnail size
// and return the thumbnail static image id
function downloadThumbnail(url) {
    let download = function (uri, filename, callback) {
        requestLib.head(uri, function (err, res, body) {
            //console.log('content-type:', res.headers['content-type']);
            //console.log('content-length:', res.headers['content-length']);
            requestLib(uri).pipe(fs_1.createWriteStream(filename)).on('close', callback);
        });
    };
    let tempFile = "static/uploads/" + newUUID() + "_temp";
    return new Promise((res, rej) => {
        download(url, tempFile, () => {
            sharp(tempFile)
                .resize(200)
                .png()
                .toBuffer()
                .then((data) => {
                let smallUUID = newUUID();
                fs_1.writeFile("static/uploads/" + smallUUID + ".png", data, () => {
                    fs_1.unlink(tempFile, () => { });
                    res(smallUUID + ".png");
                });
            });
        });
    });
}
exports.downloadThumbnail = downloadThumbnail;
function newUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.newUUID = newUUID;
function isUrl(str) {
    var expression = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
    var regex = new RegExp(expression);
    return !!str.match(regex);
}
exports.isUrl = isUrl;
function containsUrl(str) {
    return /[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/.test(str);
}
exports.containsUrl = containsUrl;
function parseQualifiedName(str) {
    let parts = str.split("@");
    if (parts.length == 1) {
        return {
            name: str,
            host: host() + (port() ? ":" + port() : ""),
            isOwn: true,
            isBranch: false,
            isQualified: false
        };
    }
    else if (parts.length == 2) {
        return {
            name: parts[0],
            host: parts[1],
            isOwn: parts[1] == serverAddress(),
            isBranch: false,
            isQualified: true
        };
    }
    else if (parts.length == 3) {
        return {
            name: parts[0],
            host: parts[2],
            isOwn: parts[2] == serverAddress(),
            isBranch: parts[1] == "b",
            isQualified: true
        };
    }
    else {
        throw (new Error('could not parse ' + str));
    }
}
exports.parseQualifiedName = parseQualifiedName;
function renderQualifiedName(obj) {
    return obj.name + "@" + obj.host;
}
exports.renderQualifiedName = renderQualifiedName;
function isAdmin(name) {
    return getAdmins().some(e => e == name);
}
exports.isAdmin = isAdmin;
function hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err)
                reject();
            else
                resolve(derivedKey.toString("hex"));
        });
    });
}
exports.hashPassword = hashPassword;
function renderRemoteHTML(str) {
    return sanitizeHtml(str, { allowedTags: [] });
}
exports.renderRemoteHTML = renderRemoteHTML;
function renderMarkdown(str) {
    str = renderRemoteHTML(str);
    str = str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    let converter = new showdown.Converter();
    let html = converter.makeHtml(str);
    return sanitizeHtml(html, {
        allowedTags: ["h1", "h2", "h3", "h4", "p", "a", "img", "b", "i", "strong", "hr"]
    });
}
exports.renderMarkdown = renderMarkdown;
let digits64 = //   0       8       16      24      32      40      48      56     63
 
//   v       v       v       v       v       v       v       v      v
"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
let digit64Map = (function () {
    var digits = digits64;
    var digitsMap = {};
    for (var i = 0; i < digits.length; i++) {
        digitsMap[digits[i]] = i;
    }
    return digitsMap;
})();
function intToBase64(int32) {
    let result = "";
    while (true) {
        result = digits64[int32 & 0x3f] + result;
        int32 >>>= 6;
        if (int32 == 0)
            break;
    }
    return result;
}
exports.intToBase64 = intToBase64;
function base64ToInt(digitsStr) {
    let result = 0;
    let digits = digitsStr.split("");
    for (let i = 0; i < digits.length; i++) {
        result = (result << 6) + digit64Map[digits[i]];
    }
    return result;
}
exports.base64ToInt = base64ToInt;
function snakeToCamelCase(str) {
    return str.replace(/_\w/g, (m) => m[1].toUpperCase());
}
exports.snakeToCamelCase = snakeToCamelCase;
function camelToSnakeCase(input) {
    return input.replace(/[\w]([A-Z])/g, function (m) {
        return m[0] + "_" + m[1];
    }).toLowerCase();
}
exports.camelToSnakeCase = camelToSnakeCase;
const model = __importStar(require("./model"));
function urlForUser(user) {
    if (typeof user == "string")
        return urlForPath("user/" + user);
    else
        return urlForPath("user/" + user.name);
}
exports.urlForUser = urlForUser;
function urlForBranch(branch) {
    if (typeof branch == "string")
        return urlForPath("branch/" + branch);
    else
        return urlForPath("branch/" + branch.name);
}
exports.urlForBranch = urlForBranch;
async function getLoggedUser(cookies) {
    if (cookies.session) {
        let session = await model.getSessionById(cookies.session);
        if (session && session.userName) {
            let user = await model.getUserByName(session.userName);
            if (user) {
                return user;
            }
        }
    }
    return undefined;
}
exports.getLoggedUser = getLoggedUser;
async function createViewData(cookies) {
    let viewData = {};
    if (cookies.session) {
        let session = await model.getSessionById(cookies.session);
        if (session && session.userName) {
            let user = await model.getUserByName(session.userName);
            if (user) {
                viewData.userName = user.name;
                viewData.user = user;
                viewData.isAdmin = isAdmin(user.name);
                viewData.notifCount = await model.getNotificationCountByUser(user);
            }
        }
    }
    return viewData;
}
exports.createViewData = createViewData;
function isObjectEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
exports.isObjectEmpty = isObjectEmpty;
function concat(arrs) {
    let r = [];
    arrs.map(arr => {
        r.push(...arr);
    });
    return r;
}
exports.concat = concat;
