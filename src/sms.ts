import * as utils from "./utils";
const twilio = require("twilio");

let client = null as any;

setTimeout(() => { // wait utils config loading... :(
    client = twilio(utils.config.twilioSID, utils.config.twilioToken);
}, 1000);

export function sendToAdmin(msg: string): void {
    client.messages.create({
        body: msg,
        from: utils.config.twilioNumber,
        to: utils.config.adminPhone
    })
    .then((message: any) => console.log(message.sid));
}