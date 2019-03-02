import * as utils from "./utils";
import * as model from "./model";
const request = require("request");

export async function postToRemote(act: model.Activity, remote: model.RemoteInstance): Promise<void> {
    if (!remote.blocked) {
        let user = await model.getUserByName(act.author);
        
        if (user) {
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
                body: JSON.stringify(model.activityToJSON(act))
            };
            
            request.post(options, (err: any, resp: any, body: string) => {
                console.log(err, resp, body);
                utils.log(err, resp, body);
            });
        }
    }
}
