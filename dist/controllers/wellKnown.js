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
async function handleWellKnownGet(url, query, req, res, body, cookies) {
    if (url[1] == "webfinger") {
        if (typeof query.resource == "string") {
            let userQuery = query.resource.split("acct:")[1];
            let userName = userQuery.split("@")[0];
            let user = await model.getUserByName(userName);
            utils.log("webfinger", query.resource);
            res.setHeader('Content-Type', 'application/json');
            if (user) {
                res.end(JSON.stringify({
                    "subject": "acct:" + userQuery,
                    "links": [{
                            "rel": "self",
                            "type": "application/activity+json",
                            "href": utils.urlForPath("user/" + user.name)
                        }]
                }));
            }
            else {
                let branch = await model.getBranchByName(userName);
                if (branch) {
                    res.end(JSON.stringify({
                        "subject": "acct:" + userQuery,
                        "links": [{
                                "rel": "self",
                                "type": "application/activity+json",
                                "href": utils.urlForPath("branch/" + userName)
                            }]
                    }));
                }
                else {
                    res.end("Error");
                }
            }
        }
    }
    else
        res.end("Error with url");
}
exports.handleWellKnownGet = handleWellKnownGet;
