import * as utils from "./utils";
import * as model from "./model";
const request = require("request");

export async function postToRemote(
    actorUrl: string,
    actorKeyUrl: string,
    actorKey: string,
    activityJson: string,
    remote: model.RemoteInstance
): Promise<void> {
    if (!remote.blocked) {
        console.log("posting to", remote, actorUrl, activityJson);
        
        utils.log("Sending post from", actorUrl, "to remote instance", activityJson);
        
        let inbox = "https://" + remote.host + "/inbox";
        
        let date = new Date().toUTCString();
        
        let stringToSign = `date: ${date}`;
        let signedString = utils.signString(actorKey, stringToSign);
        let header       = `keyId="${actorKeyUrl}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
        
        let options = {
            url:  inbox,
            headers: {
                Host      : remote.host,
                Date      : date,
                Signature : header,
            },
            body: activityJson
        };
        
        request.post(options, (err: any, resp: any, body: string) => {
            utils.log("Post to remote instance answer", err, resp, body);
            console.log("Post to remote instance answer", err, body);
        });
    } else {
        throw("Can't post to remote instance, instance " + remote.host + " is blocked");
    }
}

export async function postToRemoteForUsers(users: string[], activity: string, authorUrl: string, privateKey: string): Promise<void> {
    users.map(async (follower: string) => {
        let remote = await model.getRemoteInstanceByHost(follower.split("/")[2]);
        if (remote)
            postToRemote(
                authorUrl,
                authorUrl + "#main-key",
                privateKey,
                activity,
                remote
            );
    });
}

// handle follow request from an other server. For example someone from mastodon wants to follow user1 from our server.
// we need to answer with a signed Accept message
export async function handleFollow(streamObject: any, actorUrl: string, privateKeyId: string, privateKey: string): Promise<void> {
    await model.createFollow(streamObject.actor, actorUrl);
    
    let remoteDomain = streamObject.actor.split("/")[2];
    
    let date = new Date().toUTCString();
    
    let stringToSign = `date: ${date}`;
    let signedString = utils.signString(privateKey, stringToSign);
    let header       = `keyId="${privateKeyId}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
    
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
        url:  streamObject.actor + "/inbox", // this won't work for some server. Will fix later
        headers: {
            Host      : remoteDomain,
            Date      : date,
            Signature : header,
        },
        body: body
    };
    
    request.post(options, (err: any, resp: any, body: string) => {
        utils.log("Post to remote instance follow accept answer", err, resp, body);
    });
}

export function sendSignedRequest(actorDestination: string, body: any, privateKey: string, privateKeyId: string): Promise<void> {
    return new Promise((res, rej) => {
        let remoteDomain = actorDestination.split("/")[2];
        let bodyString = JSON.stringify(body);
        let bodySha256 = utils.sha256(bodyString);
        
        let date = new Date().toUTCString();
        
        let stringToSign = `date: ${date}\ndigest: sha-256=${bodySha256}`;
        let signedString = utils.signString(privateKey, stringToSign);
        let header       = `keyId="${privateKeyId}",algorithm="rsa-sha256",headers="date digest",signature="${signedString}"`;
        
        let options = {
            url:  actorDestination + "/inbox", // this won't work for some server. Will fix later
            headers: {
                Host      : remoteDomain,
                Date      : date,
                Digest    : "sha-256=" + bodySha256,
                Signature : header,
            },
            body: bodyString
        };
        
        request.post(options, (err: any, resp: any, body: string) => {
            utils.log("Signed request resp", err, resp, body, options);
            res();
        });
    });
}

export async function createFollowRequest(actor: string, target: string): Promise<any> {
   return {
       "@context": "https://www.w3.org/ns/activitystreams",
       id: utils.newUUID(),
       actor: actor,
       object: target,
       type: "Follow"
   };
}
