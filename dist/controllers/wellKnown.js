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
            if (user) {
                res.setHeader('Content-Type', 'application/json');
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
                res.end("Error");
            }
        }
    }
    else
        res.end("Error with url");
}
exports.handleWellKnownGet = handleWellKnownGet;
