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
const request = require("request");
async function handleThread(url, query, req, res, body, cookies) {
    if (url[1]) {
        let threadId = url[1].indexOf("://") != -1 ? decodeURIComponent(url[1]) : utils.urlForPath("thread/" + url[1]);
        let asJson = !!query.json || (req.headers.accept && (req.headers.accept.indexOf("json") != -1));
        if (asJson)
            res.setHeader('Content-Type', 'application/json');
        let thread = await model.getThreadById(threadId);
        if (thread) {
            if (asJson) {
                let threadJSON = Object.assign({}, await model.threadToJSON(thread), { childrens: await Promise.all((await model.getThreadFlatComments(thread)).map(model.commentToJSON)) });
                res.end(JSON.stringify(threadJSON));
            }
            else {
                let branch = await model.getBranchByName(thread.branch);
                let user = await utils.getLoggedUser(cookies);
                if (branch) {
                    let viewData = Object.assign({}, await utils.createViewData(cookies), { thread: thread, branch: branch, isBranchAdmin: await model.isBranchAdmin(user, branch), commentTree: await model.getThreadCommentsForClient(user, thread.id) });
                    let theme = query.theme || "";
                    if (theme)
                        theme = theme + "-";
                    res.end(utils.renderTemplate("views/" + theme + "thread.njk", viewData));
                }
                else
                    res.end("Error finding branch");
            }
        }
        else
            res.end("404 thread not found");
    }
    else {
        res.end("404 no thread id");
    }
}
exports.handleThread = handleThread;
