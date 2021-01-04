import { readFileSync, readFile, createWriteStream, writeFile, unlink } from "fs";
const { createHash } = require("crypto");
import * as crypto from "crypto";
const { generateKeyPair } = require("crypto");
const createSign = require("crypto").createSign;
const createVerify = require("crypto").createVerify;
const requestLib = require("request");
import * as showdown from "showdown";
const sanitizeHtml = require("sanitize-html");
const sharp = require("sharp");

export let config = {} as any;

export const configLoaded = new Promise((resolve, reject) => {
    readFile("config.json", "UTF-8", (err, data) => {
        config = JSON.parse(data);
        
        generateTestData = !!config.generateTestData;
        migrationNumber = config.migrationNumber || 0;
        
        resolve();
    });
});

import * as mails from "./mails";
import * as sms from "./sms";

export function port(): string {
    return config.port == undefined ? 9090 : config.port == "" ? "" : config.port;
}
export function realPort(): string {
    return config.realPort == undefined ? 9090 : config.realPort == "" ? "" : config.realPort;
}
export function protocol(): string {
    return config.protocol || "http";
}

export function host(): string {
    return config.host || "0.0.0.0";
}

export let generateTestData = !!config.generateTestData;
export let migrationNumber = config.migrationNumber || 0;

function saveConfig(){
    setTimeout(() => {
        writeFile("config.json", JSON.stringify(config, undefined, 4), "UTF-8", () => {});
    }, 0);
}

export function alertLog(logType: "branchCreation" | "userCreation", content: string) {
    if (config.logs && config.logs[logType]) {
        if (config.logs[logType].email)
            mails.sendAdminAlert(content);
        if (config.logs[logType].sms)
            sms.sendToAdmin(content);
    }
}

export function getServerName(): string { return config.serverName || "default server name" }
export function setServerName(name: string) {
    config.serverName = name;
    saveConfig();
}

export function setMigrationNumber(n: number) {
    migrationNumber = n;
    config.migrationNumber = migrationNumber;
    saveConfig();
}

export function getAdmins(): string[] { return config.admins || [] }
export function setAdmins(names: string[]) {
    config.admins = names;
    saveConfig();
}

export function getBlockNewInstances(): boolean { return config.blockNewInstances == undefined ? false : config.blockNewInstances }
export function setBlockNewInstances(block: boolean) {
    config.blockNewInstances = block;
    saveConfig();
}

export function getAcceptSignUp(): boolean { return config.acceptSignUp == undefined ? true : config.acceptSignUp }
export function setAcceptSignUp(accept: boolean) {
    config.acceptSignUp = accept;
    saveConfig();
}

export function getHeadHTML(): string { return config.headHTML || "" }
export function setHeadHTML(html: string) {
    config.headHTML = html;
    saveConfig();
}

export function getFooterHTML(): string { return config.footerHTML || "" }
export function setFooterHTML(html: string) {
    config.footerHTML = html;
    saveConfig();
}

export function getCustomCSS(): string { return config.customCSS || "" }
export function setCustomCSS(css: string) {
    config.customCSS = css;
    saveConfig();
}

// a list of branch names or a list of sections with a names and associated branches
export type OverviewBranches = string[] | {name: string, branches: string[]}[];
export function getOverviewBranches(): OverviewBranches {
    return config.overviewBranches;
}
export function setOverviewBranches(ob: OverviewBranches) {
    config.overviewBranches = ob;
    saveConfig();
}

export function getOverviewHasThreads(): boolean { return config.overviewHasThreads == undefined ? true : config.overviewHasThreads }
export function setOverviewHasThreads(accept: boolean) {
    config.overviewHasThreads = accept;
    saveConfig();
}

export function serverAddress() {
    return host() + (port() ? (":" + port()) : "");
}

export function baseUrl(): string {
    return protocol() + "://" + serverAddress();
}

import * as njk from "nunjucks";
njk.configure("src", {autoescape: true});


export function urlForPath(path: string): string {
    return baseUrl() + "/" + path;
}

export function last<A>(list: A[]): A {
    return list[list.length-1];
}

let logStream = createWriteStream("log.txt", {flags: "a"});

export function log(...args: any[]) {
    logStream.write( new Date().toISOString() + ": " );
    logStream.write( args.map(e => JSON.stringify(e)).join(" ") );
    logStream.write( "\n" );
}

export interface KeyPair {
    publicKey: string,
    privateKey: string
}
export function generateUserKeyPair(): Promise<KeyPair> {
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
        }, (err: any, publicKey: string, privateKey: string) => {
            resolve({
                publicKey,
                privateKey
            });
        });
    });
}

export function sha256(str: string): string {
    return createHash("sha256").update(str, "utf8").digest("base64");
}

export function signString(key: string, content: string): string {
    let sign = createSign("RSA-SHA256");
    sign.update(content);
    
    return sign.sign(key, "base64");
}

export function verifyString(key: string, signature: string, content: string): boolean {
    let verify = createVerify("RSA-SHA256");
    verify.update(content);
    
    return verify.verify(key, signature, "base64");
}

export function endWithRedirect(res: any, url: string): void{
    res.statusCode = 303;
    res.setHeader("Location", url);
    res.end();
}

export function parseCookies(cookie: string): {[key: string]: string} {
    return cookie.split(';').reduce(
        function(prev: any, curr: any) {
            var m = / *([^=]+)=(.*)/.exec(curr) as any;
            var key = m[1];
            var value = decodeURIComponent(m[2]);
            prev[key] = value;
            return prev;
        },
        { }
    );
}

export function stringifyCookies(cookies: {[key: string]: string}): string {
    var list = [];
    for (var key in cookies) {
        list.push(key + '=' + encodeURIComponent(cookies[key]));
    }
    return list.join('; ');
}

export function renderTemplate(templatePath: string, viewData: any): Promise<string> {
    return new Promise((res, rej) => {
        njk.render(templatePath, {
            serverName: getServerName(),
            acceptSignUp: getAcceptSignUp(),
            headHTML: getHeadHTML(),
            footerHTML: getFooterHTML(),
            customCSS: getCustomCSS(),
                
            utils: {
                encodeURIComponent: encodeURIComponent,
                threadLink: (id: string) => {
                    if (id.split("/")[2] == serverAddress())
                        return id;
                    else
                        return "/thread/" + encodeURIComponent(id);
                },
                renderMarkdown: renderMarkdown,
                renderRemoteHTML: renderRemoteHTML,
                renderUserName: (name: string) => {
                    if (name.indexOf("@"+serverAddress()) == -1)
                        return name;
                    else
                        return name.substr(0, name.indexOf("@"+host()));
                },
                renderRelativeTime: (date: number) => {
                    let days = (new Date().getTime() - date) / (1000 * 60 * 60 * 24);
                    days = Math.floor(days);
                    
                    if (days > 1)
                        return days + " days ago";
                    else
                        return "one day ago";
                },
                isUrl: isUrl
            },
            ...viewData
        }, (err, str) => {
            if (err) {
                console.log(err);
                rej(err);
            } else {
                res(str);
            }
        });
    });
}

export function request(options: any): Promise<{resp: any, body: string}> {
    return new Promise((resolve, reject) => {
        requestLib(options, (err: any, resp: any, body: string) => {
            if (err) reject(err);
            else resolve({resp: resp, body: body})
        });
    });
}

export enum MediaType {
    Image = "image",
    Video = "video",
    Iframe = "iframe"
}

export interface ExternalMedia {
    type: MediaType,
    url: string,
    thumbnail: string | undefined
}

export function externalMediaToAttachment(media: ExternalMedia): any {
    return {
        "type": "Document",
        "mediaType": "image/jpeg",
        "url": media.url,
        "name": null //,
        //"blurhash": "U66@vUtR0KMx0JRP?H%MJ8nPi_S}?HxuIoMx"
    }
}

export function getUrlFromOpenGraph(url: string): Promise<ExternalMedia | undefined> {
    return new Promise((resolve, reject) => {
        requestLib.get(url, (err: any, resp: any, data: string) => {
            if (data) {
                if (resp.headers["content-type"] && resp.headers["content-type"].indexOf("image") != -1) {
                    resolve({ type: MediaType.Image
                            , url: url
                            , thumbnail: undefined
                            });
                    return;
                }
                
                let videoUrl = "";
                let imageUrl = "";
                let iframeUrl = "";
                
                data.split("<meta")
                    .map(s => s.split("/>")[0])
                    .map(s => {
                        let url: string | undefined = undefined;
                        try {
                            url = s.split('content="')[1].split('"')[0];
                        } catch (e) {}
                        
                        if (url) {
                            if (s.indexOf('property="og:video"') != -1) {
                                videoUrl = url;
                            } else if (s.indexOf('property="og:video:url"') != -1) {
                                // since youtube has 2 og:video:url, which sucks, I take the one that I can embed
                                if (url.indexOf("youtube") == -1 || url.indexOf("embed") != -1)
                                    iframeUrl = url;
                            } else if (s.indexOf('property="og:image"') != -1) {
                                imageUrl = url;
                            }
                        }
                    });
                 
                data.split("<link")
                    .map(s => s.split("/>")[0])
                    .map(s => {
                        let url: string | undefined = undefined;
                        try {
                            url = s.split('href="')[1].split('"')[0];
                        } catch (e) {}
                        
                        if (url) {
                            if (s.indexOf('rel="image_src"') != -1) {
                                imageUrl = url;
                            }
                        }
                    });
                
                if (videoUrl)
                    resolve({ type: MediaType.Video
                            , url: videoUrl
                            , thumbnail: undefined
                            });
                else if (iframeUrl)
                    resolve({ type: MediaType.Iframe
                            , url: iframeUrl
                            , thumbnail: undefined
                            });
                else if (imageUrl)
                    resolve({ type: MediaType.Image
                            , url: imageUrl
                            , thumbnail: undefined
                            });
            } else {
                reject();
            }
        });
    });
}

// from an image url download the image, resize it to a thumbnail size
// and return the thumbnail static image id
export function downloadThumbnail(url: string): Promise<string> {
    let download = function(uri: string, filename: string, callback: any){
        requestLib.head(uri, function(err: any, res: any, body: any){
            //console.log('content-type:', res.headers['content-type']);
            //console.log('content-length:', res.headers['content-length']);
            
            requestLib(uri).pipe(createWriteStream(filename)).on('close', callback);
        });
    };
    
    let tempFile = "static/uploads/" + newUUID() + "_temp";
    
    return new Promise((res, rej) => {
        download(url, tempFile, () => {
            sharp(tempFile)
            .resize(200)
            .png()
            .toBuffer()
            .then((data: any) => {
                let smallUUID = newUUID();
                
                writeFile("static/uploads/" + smallUUID + ".png", data, () => {
                    unlink(tempFile, () => {});
                    
                    res(smallUUID + ".png");
                });
            });
        });
    });
}

export function newUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function isUrl(str: string): boolean {
    var expression = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
    var regex = new RegExp(expression);
    return !!str.match(regex);
}

export function containsUrl(str: string): boolean {
    return /[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/.test(str);
}

export function parseQualifiedName(str: string): {name: string, host: string, isOwn: boolean, isBranch: boolean, isQualified: boolean} {
    let parts = str.split("@");
    
    if (parts.length == 1) {
        return {
            name: str,
            host: host() + (port() ? ":"+port() : ""),
            isOwn: true,
            isBranch: false,
            isQualified: false
        };
    } else if (parts.length == 2) {
        return {
            name: parts[0],
            host: parts[1],
            isOwn: parts[1] == serverAddress(),
            isBranch: false,
            isQualified: true
        };
    } else if (parts.length == 3) {
        return {
            name: parts[0],
            host: parts[2],
            isOwn: parts[2] == serverAddress(),
            isBranch: parts[1] == "b",
            isQualified: true
        };
    } else {
        throw(new Error('could not parse ' + str));
    }
}

export function renderQualifiedName(obj: {name: string, host: string}): string {
    return obj.name + "@" + obj.host;
}

export function isAdmin(name: string): boolean {
    return getAdmins().some(e => e == name);
}

export function hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err)
                reject();
            else
                resolve(derivedKey.toString("hex"));
        });
    });
}

export function renderRemoteHTML(str: string): string {
    return sanitizeHtml(str, {allowedTags: []});
}

export function renderMarkdown(str: string): string {
    str = renderRemoteHTML(str);
    
    str = str.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&apos;');
    
    let converter = new showdown.Converter()
    let html = converter.makeHtml(str);
    return sanitizeHtml(html, {
        allowedTags: ["h1", "h2", "h3", "h4", "p", "a", "img", "b", "i", "strong", "hr"]
    });
}
let digits64 = //   0       8       16      24      32      40      48      56     63
               //   v       v       v       v       v       v       v       v      v
                   "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
let digit64Map: {[key: string]: number} = (function(){
    var digits = digits64;
    var digitsMap: {[key: string]: number}  = {};
    for (var i = 0; i < digits.length; i++) {
        digitsMap[digits[i]] = i;
    }
    
    return digitsMap;
})();

export function intToBase64(int32: number): string {
    let result = "";
    
    while(true) {
        result = digits64[int32 & 0x3f] + result;
        int32 >>>= 6;
        if (int32 == 0)
            break;
    }
    
    return result;
}

export function base64ToInt(digitsStr: string): number {
    let result = 0;
    
    let digits = digitsStr.split("");
    
    for (let i = 0 ; i < digits.length ; i++) {
        result = (result << 6) + digit64Map[digits[i]];
    }
    
    return result;
}
export function snakeToCamelCase(str: string): string {
    return str.replace(/_\w/g, (m) => m[1].toUpperCase());
}
export function camelToSnakeCase(input: string): string {
    return input.replace(/[\w]([A-Z])/g, function(m) {
        return m[0] + "_" + m[1];
    }).toLowerCase();
}

import * as model from "./model";
export function urlForUser(user: string | model.User): string {
    if (typeof user == "string")
        return urlForPath("user/" + user);
    else
        return urlForPath("user/" + user.name);
}

export function urlForBranch(branch: string | model.Branch): string {
    if (typeof branch == "string")
        return urlForPath("branch/" + branch);
    else
        return urlForPath("branch/" + branch.name)
}

export async function getLoggedUser(cookies: {[key: string]: string}): Promise<model.User | undefined> {
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
export async function createViewData(cookies: any): Promise<any> {
    let viewData: any = {};
    
    if (cookies.session) {
        let session = await model.getSessionById(cookies.session);
        if (session && session.userName) {
            let user = await model.getUserByName(session.userName);
            if (user) {
                viewData.userName = user.name;
                viewData.user = user;
                viewData.isAdmin = isAdmin(user.name);
                viewData.notifCount = await model.getNotificationCountByUser(user)
            }
        }
    }
    
    return viewData;
}

export function isObjectEmpty(obj: {[key: string]: any}): boolean {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

export function concat<A>(arrs: A[][]): A[] {
    let r: A[] = [];
    
    arrs.map(arr => {
        r.push(...arr);
    });
    
    return r;
}
