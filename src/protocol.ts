import * as utils from "./utils";
import * as model from "./model";
const request = require("request");

export async function postToRemote(act: model.Activity, remote: model.RemoteInstance): Promise<void> {
    if (!remote.blocked) {
        let user = await model.getUserByName(act.author);
        console.log("posting to", remote);
        
        if (user) {
            utils.log("Sending post from", user.name, "to remote instance");
            
            let inbox = "https://" + remote.host + "/inbox";
            
            let date = new Date().toUTCString();
            
            let stringToSign = `date: ${date}`;
            let signedString = utils.signString(user.privateKey, stringToSign);
            let header       = `keyId="${utils.urlForPath("user/"+user.name)}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
            
            let options = {
                url:  inbox,
                headers: {
                    Host      : remote.host,
                    Date      : date,
                    Signature : header,
                },
                body: JSON.stringify(await model.activityToJSON(act))
            };
            
            request.post(options, (err: any, resp: any, body: string) => {
                utils.log("Post to remote instance answer", err, resp, body);
            });
        }
    } else {
        throw("Can't post to remote instance, instance " + remote.host + " is blocked");
    }
}

export async function postToRemoteForUsers(users: string[], activity: model.Activity): Promise<void> {
    users.map(async (follower: string) => {
        let remote = await model.getRemoteInstanceByHost(follower.split("/")[2]);
        if (remote)
            postToRemote(activity, remote);
    });
}
