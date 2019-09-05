import * as utils from "./utils";
const twilio = require("twilio");

let client = null as any;

utils.configLoaded.then(_ => {
    if (utils.config.twilioSID && utils.config.twilioToken)
        client = twilio(utils.config.twilioSID, utils.config.twilioToken);
    else {
        console.log("Did not init twilio sms, lacking config 'twilioSID' and 'twilioToken'");
    }
});

export function sendToAdmin(msg: string): void {
    client.messages.create({
        body: msg,
        from: utils.config.twilioNumber,
        to: utils.config.adminPhone
    })
    .then((message: any) => console.log(message.sid));
}