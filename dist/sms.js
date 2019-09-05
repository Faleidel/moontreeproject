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
const twilio = require("twilio");
let client = null;
utils.configLoaded.then(_ => {
    if (utils.config.twilioSID && utils.config.twilioToken)
        client = twilio(utils.config.twilioSID, utils.config.twilioToken);
    else {
        console.log("Did not init twilio sms, lacking config 'twilioSID' and 'twilioToken'");
    }
});
function sendToAdmin(msg) {
    client.messages.create({
        body: msg,
        from: utils.config.twilioNumber,
        to: utils.config.adminPhone
    })
        .then((message) => console.log(message.sid));
}
exports.sendToAdmin = sendToAdmin;
