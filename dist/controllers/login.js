"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("../utils"));
const model = __importStar(require("../model"));
const queryString = __importStar(require("querystring"));
async function handleLoginPost(url, query, req, res, body, cookies) {
    let { user, password } = queryString.parse(body);
    let qName = utils.parseQualifiedName(user);
    if (!qName.isQualified)
        user = user + "@" + qName.host;
    let userObject = await model.getUserByName(user);
    if (userObject
        && !userObject.banned
        && userObject.local
        && userObject.local
        && await utils.hashPassword(password, userObject.passwordSalt) == userObject.passwordHashed) {
        let session = await model.createSession();
        await model.loginSession(session, userObject);
        res.setHeader("Set-Cookie", utils.stringifyCookies({
            session: session.id
        }));
        utils.log("User ", user, "login with headers:", req.headers);
        utils.endWithRedirect(res, "/");
    }
    else {
        let viewData = Object.assign({}, await utils.createViewData(cookies), { error: "The user and password didn't match", user: qName.name });
        let html = await utils.renderTemplate("views/login.njk", viewData);
        res.end(html);
    }
}
exports.handleLoginPost = handleLoginPost;
async function handleLogin(url, query, req, res, body, cookies) {
    let viewData = await utils.createViewData(cookies);
    let html = await utils.renderTemplate("views/login.njk", viewData);
    res.end(html);
}
exports.handleLogin = handleLogin;
