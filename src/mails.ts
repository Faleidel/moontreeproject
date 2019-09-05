import * as utils from "./utils";
const sendGrid = require("@sendgrid/mail");

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

utils.configLoaded.then(_ => {
    if (utils.config.sendGridKey)
        sendGrid.setApiKey(utils.config.sendGridKey);
    else
        console.log("No sendgrid api key in config (config.sendGridKey)");
});

interface Mail {
    to: string | string[],
    subject: string,
    text?: string,
    html?: string
};

type AnonymousMail = Omit<Mail, 'to'>;

export function sendMail(mail: Mail): void {
    sendGrid.send({
        ...mail,
        from: "admin@" + utils.host
    });
}

export function sendAdmin(mail: AnonymousMail): void {
    if (!utils.config.adminEmail) {
        utils.log("Error with sendAmin, no email in config");
    } else {
        sendMail({
            ...mail,
            to: utils.config.adminEmail
        });
    }
}

export function sendAdminAlert(content: string) {
    sendAdmin({
        subject: "admin alert",
        text: content
    });
}