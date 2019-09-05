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
async function handleSignupPost(url, query, req, res, body, cookies) {
    if (!utils.getAcceptSignUp()) {
        res.end("We do not accept registrations right now");
        return;
    }
    let { user, password, password2 } = queryString.parse(body);
    if (password == password2) {
        let errors = [];
        if (user != encodeURIComponent(user))
            errors.push("User name contains illegal characters");
        if (user.length > 40)
            errors.push("User name is too long");
        if (user.length < 3)
            errors.push("User name is too small, must be more then 2 characters");
        if (errors.length == 0) {
            await model.createUser(user, password)
                .then(async (worked) => {
                if (worked) {
                    let session = await model.createSession();
                    let userObject = await model.getUserByName((user + "@" + utils.serverAddress()));
                    await model.loginSession(session, userObject);
                    res.setHeader("Set-Cookie", utils.stringifyCookies({
                        session: session.id
                    }));
                    utils.log("New user", user, "with headers:", req.headers);
                    utils.endWithRedirect(res, "/");
                }
                else {
                    res.end("Could not create user");
                }
            });
        }
        else {
            res.end(errors.join("</br>"));
        }
    }
    else {
        // RETURN TO SIGNING WITH ERROR MESSAGE
        res.end("Passwords don't match");
    }
}
exports.handleSignupPost = handleSignupPost;
