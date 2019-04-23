"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("../utils"));
const model = __importStar(require("../model"));
const request = require("request");
async function handleUserInboxPost(url, query, req, res, body, cookies) {
    let userName = url[1];
    let streamObject = JSON.parse(body);
    if (streamObject.type == "Follow" && streamObject.actor) {
        let user = await model.getUserByName(userName);
        if (user) {
            model.addUserFollower(user, streamObject.actor);
            res.statusCode = 201;
            res.end();
            let remoteDomain = streamObject.actor.split("/")[2];
            let date = new Date().toUTCString();
            let stringToSign = `date: ${date}`;
            let signedString = utils.signString(user.privateKey, stringToSign);
            let header = `keyId="${utils.urlForPath("user/" + user.name)}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
            let body = JSON.stringify({
                "@context": [
                    "https://www.w3.org/ns/activitystreams",
                    "https://w3id.org/security/v1"
                ],
                id: utils.urlForPath(`user/${userName}/followaccept/${Math.random()}`),
                type: "Accept",
                actor: utils.urlForPath("user/" + user.name),
                object: streamObject
            });
            utils.log("ACCEPT BODY", body);
            let options = {
                url: streamObject.actor + "/inbox",
                headers: {
                    Host: remoteDomain,
                    Date: date,
                    Signature: header,
                },
                body: body
            };
            request.post(options, (err, resp, body) => {
                utils.log("Post to remote instance follow accept answer", err, resp, body);
            });
        }
        else {
            res.statusCode = 404;
            res.end("Invalid user");
        }
    }
    else {
        utils.log("STREAM OBJECT IN INBOX", "User", userName, "Type", streamObject.type, "Content", streamObject.object.content, streamObject);
        res.statusCode = 500;
        res.end("Action not supported");
    }
}
exports.handleUserInboxPost = handleUserInboxPost;
async function handleUserGet(url, query, req, res, body, cookies) {
    let name = url[1];
    if (name.indexOf("@") == -1)
        name += "@" + utils.serverAddress;
    let user = await model.getUserByName(name);
    let asJson = !!query.json || (req.headers.accept.indexOf("json") != -1);
    if (asJson)
        res.setHeader('Content-Type', "application/ld+json");
    if (user) {
        let activitys = await model.getActivitysByAuthor(name);
        if (url.length == 2) { // url is `/user/someUserName` and nothing more
            if (asJson) {
                res.end(JSON.stringify({
                    "@context": [
                        "https://www.w3.org/ns/activitystreams",
                        "https://w3id.org/security/v1"
                    ],
                    "id": utils.urlForPath("user/" + name),
                    "type": "Person",
                    "preferredUsername": name,
                    "inbox": utils.urlForPath("user/" + name + "/inbox"),
                    "outbox": utils.urlForPath("user/" + name + "/outbox"),
                    "publicKey": {
                        "id": utils.urlForPath("user/" + name + "#main-key"),
                        "owner": utils.urlForPath("user/" + name),
                        "publicKeyPem": user.publicKey
                    }
                }));
            }
            else {
                let viewData = Object.assign({}, await utils.createViewData(cookies), { accountName: name, isBanned: (!!user.banned) + "", activitys: (await Promise.all(activitys.map((a) => model.activityToJSON(a)))).filter((e) => !!e) });
                if (viewData.user && viewData.user.name == user.name) {
                    viewData.notifications = await model.getNotificationsByUser(viewData.user);
                }
                let html = utils.renderTemplate("views/account.njk", viewData);
                res.end(html);
            }
        }
        else if (url[2] == "outbox") {
            if (!query.page) {
                res.end(JSON.stringify({
                    "@context": [
                        "https://www.w3.org/ns/activitystreams"
                    ],
                    type: "OrderedCollection",
                    first: utils.urlForPath("user/" + name + "/outbox?page=true"),
                    last: utils.urlForPath("user/" + name + "/outbox?min_id=0&page=true"),
                    id: utils.urlForPath("user/" + name + "/outbox"),
                    totalItems: activitys.length
                }));
            }
            else {
                res.end(JSON.stringify({
                    "@context": [
                        "https://www.w3.org/ns/activitystreams"
                    ],
                    type: "OrderedCollectionPage",
                    id: utils.urlForPath("user/" + name + "/outbox?page=true"),
                    prev: utils.urlForPath("user/" + name + "/outbox?page=true"),
                    partOf: utils.urlForPath("user/" + name + "/outbox"),
                    orderedItems: (await Promise.all(activitys.map(async (act) => {
                        return (await model.activityToJSON(act));
                    }))).filter((e) => !!e)
                }));
            }
        }
        else {
            res.end("No such url in user");
        }
    }
    else {
        res.end("Error, no such user");
    }
}
exports.handleUserGet = handleUserGet;
