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
async function postToRemote(act, remote) {
    if (!remote.blocked) {
        let user = await model.getUserByName(act.author);
        if (user) {
            utils.log("Sending post from", user.name, "to remote instance");
            let inbox = "https://" + remote.host + "/inbox";
            let date = new Date().toUTCString();
            let stringToSign = `date: ${date}`;
            let signedString = utils.signString(user.privateKey, stringToSign);
            let header = `keyId="${utils.urlForPath("user/" + user.name)}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
            let options = {
                url: inbox,
                headers: {
                    Host: remote.host,
                    Date: date,
                    Signature: header,
                },
                body: JSON.stringify(await model.activityToJSON(act))
            };
            request.post(options, (err, resp, body) => {
                utils.log("Post to remote instance answer", err, resp, body);
            });
        }
    }
    else {
        throw ("Can't post to remote instance, instance " + remote.host + " is blocked");
    }
}
exports.postToRemote = postToRemote;
