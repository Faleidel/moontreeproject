"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("./utils"));
const model = __importStar(require("./model"));
const request = require("request");
async function postToRemote(actorUrl, actorKeyUrl, actorKey, activityJson, remote) {
    if (!remote.blocked) {
        console.log("posting to", remote, actorUrl, activityJson);
        utils.log("Sending post from", actorUrl, "to remote instance", activityJson);
        let inbox = "https://" + remote.host + "/inbox";
        let date = new Date().toUTCString();
        let stringToSign = `date: ${date}`;
        let signedString = utils.signString(actorKey, stringToSign);
        let header = `keyId="${actorKeyUrl}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
        let options = {
            url: inbox,
            headers: {
                Host: remote.host,
                Date: date,
                Signature: header,
            },
            body: activityJson
        };
        request.post(options, (err, resp, body) => {
            utils.log("Post to remote instance answer", err, resp, body);
            console.log("Post to remote instance answer", err, body);
        });
    }
    else {
        throw ("Can't post to remote instance, instance " + remote.host + " is blocked");
    }
}
exports.postToRemote = postToRemote;
async function postToRemoteForUsers(users, activity, authorUrl, privateKey) {
    users.map(async (follower) => {
        let remote = await model.getRemoteInstanceByHost(follower.split("/")[2]);
        if (remote)
            postToRemote(authorUrl, authorUrl + "#main-key", privateKey, activity, remote);
    });
}
exports.postToRemoteForUsers = postToRemoteForUsers;
// handle follow request from an other server. For example someone from mastodon wants to follow user1 from our server.
// we need to answer with a signed Accept message
async function handleFollow(streamObject, actorUrl, privateKeyId, privateKey) {
    await model.createFollow(streamObject.actor, actorUrl);
    let remoteDomain = streamObject.actor.split("/")[2];
    let date = new Date().toUTCString();
    let stringToSign = `date: ${date}`;
    let signedString = utils.signString(privateKey, stringToSign);
    let header = `keyId="${privateKeyId}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
    let body = JSON.stringify({
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        id: actorUrl + "/followaccept/${Math.random()}",
        type: "Accept",
        actor: actorUrl,
        object: streamObject
    });
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
exports.handleFollow = handleFollow;
function sendSignedRequest(actorDestination, body, privateKey, privateKeyId) {
    return new Promise((res, rej) => {
        let remoteDomain = actorDestination.split("/")[2];
        let date = new Date().toUTCString();
        let stringToSign = `date: ${date}`;
        let signedString = utils.signString(privateKey, stringToSign);
        let header = `keyId="${privateKeyId}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
        let options = {
            url: actorDestination + "/inbox",
            headers: {
                Host: remoteDomain,
                Date: date,
                Signature: header,
            },
            body: body
        };
        request.post(options, (err, resp, body) => {
            utils.log("Signed request resp", err, resp, body);
            res();
        });
    });
}
exports.sendSignedRequest = sendSignedRequest;
async function createFollowRequest(actor, target) {
    return {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: utils.newUUID(),
        actor: actor,
        object: target,
        type: "Follow"
    };
}
exports.createFollowRequest = createFollowRequest;
