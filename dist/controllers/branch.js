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
const protocol = __importStar(require("../protocol"));
const request = require("request");
async function handleBranchInboxPost(url, query, req, res, body, cookies) {
    let branchName = url[1];
    let streamObject = JSON.parse(body);
    if (streamObject.type == "Follow" && streamObject.actor) {
        let branch = await model.getBranchByName(branchName);
        if (branch) {
            protocol.handleFollow(streamObject, utils.urlForBranch(branch), utils.urlForBranch(branch) + "#main-key", branch.privateKey);
            res.statusCode = 201;
            res.end();
        }
        else {
            res.statusCode = 404;
            res.end("Invalid branch");
        }
    }
    else {
        utils.log("STREAM OBJECT IN INBOX", "User", branchName, "Type", streamObject.type, "Content", streamObject.object.content, streamObject);
        res.statusCode = 500;
        res.end("Action not supported");
    }
}
exports.handleBranchInboxPost = handleBranchInboxPost;
async function handleBranch(url, query, req, res, body, cookies) {
    let branchName = url[1];
    let branch = await model.getBranchByName(branchName);
    let asJson = !!query.json || (req.headers.accept.indexOf("json") != -1);
    if (asJson) {
        if (branch) {
            let pageS = query.page;
            res.setHeader('Content-Type', 'application/json');
            if (url[2] == 'outbox') {
                if (!pageS)
                    res.end(JSON.stringify(await model.branchPostsToJSON(branch)));
                else {
                    let page = parseInt(pageS, 10);
                    if (typeof page == "number")
                        res.end(JSON.stringify(await branchJsonForPage(branch, page)));
                    else
                        res.end("Error with branch page number");
                }
            }
            else {
                res.end(JSON.stringify(await model.branchToJSON(branch)));
            }
        }
        else {
            res.statusCode = 404;
            res.end();
        }
    }
    else {
        let user = await utils.getLoggedUser(cookies);
        let pageNumber = parseInt(query.page, 10) || 0;
        let sort = query.sort;
        let threadGetter = sort == "hot"
            ? model.getHotThreadsByBranch
            : sort == "top"
                ? model.getTopThreadsByBranch
                : sort == "new"
                    ? model.getNewThreadsByBranch
                    : model.getHotThreadsByBranch;
        if (branch) {
            let viewData = Object.assign({}, await utils.createViewData(cookies), { branch: branch, pageNumber: pageNumber, sort: sort, postableBranch: true, isBranchAdmin: await model.isBranchAdmin(user, branch), threads: await threadGetter(branchName, user, pageNumber) });
            let html = utils.renderTemplate("views/branch.njk", viewData);
            res.end(html);
        }
        else {
            res.end("This branch does not exist");
        }
    }
}
exports.handleBranch = handleBranch;
async function branchJsonForPage(branch, page) {
    let threads = await model.getHotThreadsByBranch(branch.name, undefined, page);
    let items = await Promise.all(threads.map(model.threadToJSON));
    return {
        "@context": [
            "https://www.w3.org/ns/activitystreams"
        ],
        type: "OrderedCollectionPage",
        id: utils.urlForBranch(branch),
        prev: utils.urlForBranch(branch) + "/outbox?page=" + (page - 1),
        next: utils.urlForBranch(branch) + "/outbox?page=" + (page + 1),
        partOf: utils.urlForBranch(branch) + "/outbox",
        totalItems: 100000,
        orderedItems: items
    };
}
