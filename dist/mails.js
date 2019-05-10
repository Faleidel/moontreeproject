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
const sendGrid = require("@sendgrid/mail");
setTimeout(() => {
    if (utils.config.sendGridKey)
        sendGrid.setApiKey(utils.config.sendGridKey);
    else
        console.log("No sendgrid api key in config (config.sendGridKey)");
}, 1000);
;
function sendMail(mail) {
    sendGrid.send(Object.assign({}, mail, { from: "admin@" + utils.host }));
}
exports.sendMail = sendMail;
function sendAdmin(mail) {
    if (!utils.config.adminEmail) {
        utils.log("Error with sendAmin, no email in config");
    }
    else {
        sendMail(Object.assign({}, mail, { to: utils.config.adminEmail }));
    }
}
exports.sendAdmin = sendAdmin;
function sendAdminAlert(content) {
    sendAdmin({
        subject: "admin alert",
        text: content
    });
}
exports.sendAdminAlert = sendAdminAlert;
