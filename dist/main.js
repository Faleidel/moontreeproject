"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const urlUtils = __importStar(require("url"));
const utils = __importStar(require("./utils"));
const model = __importStar(require("./model"));
const protocol = __importStar(require("./protocol"));
const fs = __importStar(require("fs"));
const queryString = __importStar(require("querystring"));
const formidable = __importStar(require("formidable"));
const user_1 = require("./controllers/user");
const login_1 = require("./controllers/login");
const signup_1 = require("./controllers/signup");
const wellKnown_1 = require("./controllers/wellKnown");
const thread_1 = require("./controllers/thread");
const branch_1 = require("./controllers/branch");
const { generateKeyPair } = require("crypto");
const request = require("request");
let urlStats = {};
fs.readFile("urlStats.json", "utf-8", (err, data) => {
    if (data) {
        urlStats = JSON.parse(data);
    }
    setInterval(() => {
        fs.writeFile("urlStats.json", JSON.stringify(urlStats, undefined, 4), () => { });
    }, 1000);
});
model.loadStore(() => { });
http.createServer(async function (req, res) {
    let parsed = urlUtils.parse(req.url, true);
    let query = parsed.query;
    let url = parsed.pathname.split("/");
    if (url[0] == "")
        url.splice(0, 1);
    if (url[url.length - 1] == "")
        url.splice(url.length - 1, 1);
    if (!urlStats[url.join("/")])
        urlStats[url.join("/")] = 0;
    urlStats[url.join("/")] += 1;
    let cookies = {};
    if (req.headers.cookie)
        cookies = utils.parseCookies(req.headers.cookie);
    console.log("Url:", url);
    utils.log("Url:", url, req.headers);
    if (req.method == "POST") {
        function withStringBody(handle) {
            let bodyBuffer = Buffer.from('');
            req.on('data', (chunk) => {
                bodyBuffer = Buffer.concat([bodyBuffer, chunk]);
            });
            req.on('end', async () => {
                handle(bodyBuffer.toString());
            });
        }
        function withFiles(handle) {
            let form = new formidable.IncomingForm();
            form.parse(req, (err, fields, files) => {
                handle(fields, files);
            });
        }
        function handleStringWith(f) {
            withStringBody(body => f(url, query, req, res, body, cookies));
        }
        // POST ROUTES
        if (url[0] == "user") {
            if (url[2] == "inbox") {
                handleStringWith(user_1.handleUserInboxPost);
            }
            else
                res.end('error');
        }
        else if (url[0] == "branch") {
            if (url[2] == "inbox")
                handleStringWith(branch_1.handleBranchInboxPost);
            else
                res.end('error');
        }
        else if (url[0] == "login") {
            handleStringWith(login_1.handleLoginPost);
        }
        else if (url[0] == "signup") {
            handleStringWith(signup_1.handleSignupPost);
        }
        else if (url[0] == "setConfig") {
            withStringBody(async (body) => {
                let user = await utils.getLoggedUser(cookies);
                if (user && utils.isAdmin(user.name)) {
                    let { serverName, admins, blockNewInstances, acceptSignUp, headHTML, footerHTML, customCSS, overviewBranchesJSON, overviewHasThreads } = queryString.parse(body);
                    utils.setServerName(serverName);
                    utils.setAdmins(admins.split(",").map((s) => s.replace(/ /g, "")));
                    utils.setAcceptSignUp(acceptSignUp == "true");
                    utils.setBlockNewInstances(blockNewInstances == "true");
                    utils.setHeadHTML(headHTML);
                    utils.setFooterHTML(footerHTML);
                    utils.setCustomCSS(customCSS);
                    utils.setOverviewBranches(JSON.parse(overviewBranchesJSON));
                    utils.setOverviewHasThreads(overviewHasThreads == "true");
                    utils.endWithRedirect(res, "/config");
                }
                else {
                    utils.endWithRedirect(res, "/");
                }
            });
        }
        else if (url[0] == "branchConfig") {
            withStringBody(async (body) => {
                let user = await utils.getLoggedUser(cookies);
                if (user) {
                    let { pinedThreads, branch } = queryString.parse(body);
                    let pinedThreadsList = pinedThreads.split(",").map((s) => s.replace(/ /g, ""));
                    let branchO = await model.getBranchByName(branch);
                    if (branchO && model.isBranchAdmin(user, branchO)) {
                        model.setBranchPinedThreads(branchO, pinedThreadsList);
                        utils.endWithRedirect(res, "/branch/" + branch);
                    }
                }
            });
        }
        else if (url[0] == "branchIcon") {
            withFiles((params, files) => {
                console.log(params);
                console.log(files);
                let branchName = params.branch;
                let name = utils.last(files.icon.path.split("/"));
                let extention = utils.last(files.icon.name.split("."));
                let newPath = "static/uploads/" + name + "." + extention;
                fs.copyFile(files.icon.path, newPath, async (err) => {
                    console.log(err);
                    let branch = await model.getBranchByName(branchName);
                    if (branch) {
                        model.setBranchIcon(branch, utils.urlForPath(newPath));
                        utils.endWithRedirect(res, "/branch/" + branchName);
                    }
                });
            });
        }
        else if (url[0] == "branchAdmin") {
            withStringBody(async (body) => {
                let user = await utils.getLoggedUser(cookies);
                if (user && utils.isAdmin(user.name)) {
                    let { branch } = queryString.parse(body);
                    model.banBranch(branch);
                    utils.endWithRedirect(res, "/");
                }
                else
                    utils.endWithRedirect(res, "/");
            });
        }
        else if (url[0] == "adminRemoveComment") {
            withStringBody(async (body) => {
                let user = await utils.getLoggedUser(cookies);
                let { branchName, id } = queryString.parse(body);
                let branch = await model.getBranchByName(branchName);
                if (user && branch && (utils.isAdmin(user.name) || await model.isBranchAdmin(user, branch))) {
                    model.adminDeleteComment(id);
                    utils.endWithRedirect(res, "/branch/" + branchName);
                }
                else
                    utils.endWithRedirect(res, "/");
            });
        }
        else if (url[0] == "banUser") {
            withStringBody(async (body) => {
                let user = await utils.getLoggedUser(cookies);
                let { name } = queryString.parse(body);
                if (user && utils.isAdmin(user.name)) {
                    model.banUser(name);
                    res.end("User banned");
                }
                else
                    utils.endWithRedirect(res, "/");
            });
        }
        else if (url[0] == "instanceBlockStatus") {
            withStringBody(async (body) => {
                let user = await utils.getLoggedUser(cookies);
                if (user && utils.isAdmin(user.name)) {
                    let { host, block } = queryString.parse(body);
                    let instance = await model.getRemoteInstanceByHost(host);
                    if (instance) {
                        model.setRemoteInstanceBlockedStatus(instance, block == "true");
                        utils.endWithRedirect(res, "/instance/" + host);
                    }
                    else
                        res.end("Invalid instance");
                }
            });
        }
        else if (url[0] == "like") {
            withStringBody(async (body) => {
                let object = await model.getCommentById(body) || await model.getThreadById(body);
                let user = await utils.getLoggedUser(cookies);
                if (object && user) {
                    model.createLike(user, object);
                }
            });
        }
        else if (url[0] == "unlike") {
            withStringBody(async (body) => {
                let object = await model.getCommentById(body) || await model.getThreadById(body);
                let user = await utils.getLoggedUser(cookies);
                if (object && user) {
                    model.deleteLikeOfOn(user, object);
                }
            });
        }
        else if (url[0] == "readNotification") {
            withStringBody(async (body) => {
                let id = body;
                let notification = await model.getNotificationsById(id);
                if (notification) {
                    model.setNotificationRead(notification);
                }
                res.end("ok");
            });
        }
        else if (url[0] == "newBranch") {
            withStringBody(async (body) => {
                let { name, description } = queryString.parse(body);
                let user = await utils.getLoggedUser(cookies);
                if (name && user) {
                    let errors = [];
                    if (name != encodeURIComponent(name))
                        errors.push("Branch name contains illegal characters");
                    if (name.length > 60)
                        errors.push("Branch name is too long");
                    if (description.length > 5000)
                        errors.push("Branch description is too long");
                    if (errors.length == 0) {
                        let branch = await model.createBranch(name, description, [], user);
                        if (branch) {
                            utils.endWithRedirect(res, "/branch/" + name);
                        }
                        else {
                            res.end("Could not create branch");
                        }
                    }
                    else {
                        res.end(errors.join("</br>"));
                    }
                }
                else {
                    res.end("Error with branch name or not logged in");
                }
            });
        }
        else if (url[0] == "newThread") {
            withStringBody(async (body) => {
                let { title, content, branch, id } = queryString.parse(body);
                let user = await utils.getLoggedUser(cookies);
                if (user) {
                    let errors = [];
                    if (content.length > 10000)
                        errors.push("Error, content is too long");
                    if (!id && title.length > 200)
                        errors.push("Error, title is too long");
                    if (content.length == 0)
                        errors.push("Error, content is empty");
                    if (errors.length == 0) {
                        let branchModel = await model.getBranchByName(branch);
                        if (!id && branchModel) {
                            let thread = await model.createThread(user, title, content, branch);
                            let activity = await model.createActivity(user, thread);
                            protocol.postToRemoteForUsers(await model.getFollowersByActor(utils.urlForPath('user/' + user.name)), JSON.stringify(await model.activityToJSON(activity)), utils.urlForUser(user), user.privateKey);
                            protocol.postToRemoteForUsers(await model.getFollowersByActor(utils.urlForBranch(branch)), JSON.stringify(await model.createAnnounce(utils.urlForBranch(branch), thread.id)), utils.urlForBranch(branch), branchModel.privateKey);
                            utils.endWithRedirect(res, thread.id);
                        }
                        else {
                            let thread = await model.getThreadById(id);
                            if (thread) {
                                if (thread.author == user.name) {
                                    model.updateThread(thread, content);
                                    utils.endWithRedirect(res, thread.id);
                                }
                                else {
                                    res.end("you are not the author of this post");
                                }
                            }
                            else {
                                res.end("trying to edit a thread that does not exist");
                            }
                        }
                    }
                    else {
                        res.end(errors.join("</br>"));
                    }
                }
                else {
                    res.end("Not logged in");
                }
            });
        }
        else if (url[0] == "newComment") {
            withStringBody(async (body) => {
                let { content, threadId, objectId, backUrl, id } = queryString.parse(body);
                backUrl = decodeURIComponent(backUrl);
                let user = await utils.getLoggedUser(cookies);
                if (user) {
                    let errors = [];
                    if (content.length > 10000)
                        errors.push("Error, comment is too long");
                    if (content.length > 0)
                        errors.push("Error, comment is empty");
                    if (id) {
                        let comment = await model.getCommentById(id);
                        if (comment) {
                            if (comment.author == user.name) {
                                model.updateComment(comment, content);
                                utils.endWithRedirect(res, backUrl);
                            }
                            else {
                                res.end("Error, can't edit a comment that is not yours");
                            }
                        }
                        else {
                            res.end("Error, editing unknown comment");
                        }
                        return;
                    }
                    threadId = decodeURIComponent(threadId);
                    objectId = decodeURIComponent(objectId);
                    if (errors.length == 0 && (threadId || objectId)) {
                        let objectT = await model.getThreadById(threadId);
                        let objectC = await model.getCommentById(objectId);
                        if (objectT || objectC) {
                            let obj = objectC || objectT;
                            let comment = await model.createComment(user, content, obj.id);
                            let activity = await model.createActivity(user, comment);
                            protocol.postToRemoteForUsers(await model.getFollowersByActor(utils.urlForPath('user/' + user.name)), JSON.stringify(await model.activityToJSON(activity)), utils.urlForUser(user), user.privateKey);
                            utils.endWithRedirect(res, backUrl);
                        }
                        else {
                            console.log("Error, lacks threadId or objectId", threadId, objectId);
                        }
                    }
                    else if (errors.length != 0) {
                        res.end(errors.join("</br>"));
                    }
                    else {
                        res.end("Error while creating comment, parent is null");
                    }
                }
                else {
                    res.end("Not logged in");
                }
            });
        }
        else if (url[0] == "inbox") {
            withStringBody(async (body) => {
                console.log("GOT SOMETHING IN INBOX");
                let json = JSON.parse(body);
                if (json["@context"].some((c) => c == "ironTreeThread")) {
                    let thread = await model.threadFromJSON(json);
                    if (thread)
                        model.saveThread(thread);
                    else
                        console.log("Error with remote comment", body);
                    res.end("ok thread");
                }
                else {
                    let comment = await model.commentFromJSON(json);
                    if (comment)
                        model.saveComment(comment);
                    else
                        console.log("Error with remote comment", body);
                    res.end("ok comment");
                }
            });
        }
        else
            res.end('error');
    }
    else {
        function handleWith(f) {
            f(url, query, req, res, "", cookies);
        }
        // ROUTES GET
        if (url[0] == "user") {
            handleWith(user_1.handleUserGet);
        }
        else if (url[0] == "testPost") {
            console.log("MAKING POST REQUEST");
            request.post({
                url: "http://0.0.0.0:9753/inbox",
                body: JSON.stringify({
                    author: "raphounet@0.0.0.0:9090",
                    content: "POST FROM AN OTHER SERVER",
                    inReplyTo: "http://0.0.0.0:9753/thread/35484108633891290"
                })
            }, (err, resp, body) => {
                console.log("Answer", err, body);
            });
        }
        // TODO REMAKE
        else if (url[0] == "post") {
            //let postId = url[1];
            //res.setHeader('Content-Type', 'application/json');
            //res.end(JSON.stringify(model.activityToJSON(store.activitys[postId])));
            //            res.end(JSON.stringify({
            //                "@context": "https://www.w3.org/ns/activitystreams",
            //                
            //                "id": utils.urlForPath("post/" + post.id),
            //                "type": "Create",
            //                "actor": "https://my-example.com/actor",
            //                
            //                "object": {
            //                    "id": "https://my-example.com/hello-world",
            //                    "type": "Note",
            //                    "published": "2018-06-23T17:17:11Z",
            //                    "attributedTo": "https://my-example.com/actor",
            //                    "inReplyTo": "https://mastodon.social/@Gargron/100254678717223630",
            //                    "content": "<p>Hello world</p>",
            //                    "to": "https://www.w3.org/ns/activitystreams#Public"
            //                }
            //            }));
        }
        // TEST API
        // TODO TRANSFER / ADAPT TO POST newThread / newComment
        else if (url[0] == "newPost") {
            //            if (url.length == 4) {
            //                let from    = url[1];
            //                let to      = url[2];
            //                let content = url[3];
            //                
            //                let user = store.users[from];
            //                
            //                // WEBFINGERS
            //                request({
            //                    url: "https://mastodon.social/.well-known/webfinger?resource=acct:"+to+"@mastodon.social"
            //                }, (err: any, resp: any, body: string) => {
            //                    console.log(body);
            //                    let data = JSON.parse(body);
            //                    let link = data.links.find((l: any) => l.rel == "self").href;
            //                    
            //                    // USER ACTOR PAGE
            //                    request({
            //                        url: link,
            //                        headers: { Accept: "application/json" }
            //                    }, (err: any, resp: any, body: string) => {
            //                        let uData = JSON.parse(body);
            //                        let inbox = uData.inbox;
            //                        
            //                        let act = newPost(from, to, content);
            //                        
            //                        let date = new Date().toUTCString();
            //                        
            //                        let stringToSign = `date: ${date}`;
            //                        let signedString = utils.signString(user.privateKey, stringToSign);
            //                        let header       = `keyId="${utils.urlForPath("user/"+from)}#main-key",algorithm="rsa-sha256",headers="date",signature="${signedString}"`;
            //                        
            //                        let options = {
            //                            url:  "https://mastodon.social/users/"+to+"/inbox",
            //                            headers: {
            //                                Host      : "mastodon.social",
            //                                Date      : date,
            //                                Signature : header,
            //                            },
            //                            //body: JSON.stringify(activityToJSON(act))
            //                            body: "" // TODO
            //                        };
            //                        
            //                        console.log("###################################");
            //                        console.log(options);
            //                        
            //                        // SEND TO OUTBOUND INBOX
            //                        request.post(options, (err: any, resp: any, body: string) => {
            //                            console.log(err, resp, body);
            //                            utils.log(err, resp, body);
            //                            console.log(date, new Date().toString());
            //                            console.log("---------------------", utils.verifyString(user.publicKey, signedString, stringToSign));
            //                            console.log(user.privateKey, user.publicKey);
            //                            console.log(">>>>>>>>>>>>>>>>", stringToSign);
            //                        });
            //                    });
            //                });
            //            }
            //            else
            //                res.end("Bad params");
        }
        else if (url[0] == ".well-known") {
            handleWith(wellKnown_1.handleWellKnownGet);
        }
        else if (url[0] == "static") {
            let end = url[2] || url[1];
            let path = url[1];
            if (url[2])
                path += "/" + url[2];
            if (end.indexOf(".png") != -1 || end.indexOf(".jpg")) {
                fs.readFile("static/" + path, (err, data) => {
                    res.end(data);
                });
            }
            else if (end.indexOf(".svg") != -1) {
                res.setHeader('Content-Type', 'image/svg+xml');
                fs.readFile("static/" + url[1], "utf-8", (err, data) => {
                    res.end(data);
                });
            }
            else {
                fs.readFile("static/" + url[1], "utf-8", (err, data) => {
                    res.end(data);
                });
            }
        }
        else if (url[0] == "favicon.ico") {
            fs.readFile("static/favicon.png", (err, data) => {
                res.end(data);
            });
        }
        // HOME PAGE
        else if (url.length == 0 || url[0] == "all") {
            let user = await utils.getLoggedUser(cookies);
            let pageNumber = parseInt(query.page, 10) || 0;
            let overview = undefined;
            if (url[0] != "all" && pageNumber == 0) {
                overview = utils.getOverviewBranches();
            }
            let hideThreads = false;
            if (overview && !utils.getOverviewHasThreads())
                hideThreads = true;
            let sort = query.sort;
            let threadGetter = sort == "hot"
                ? model.getHotThreadsByBranch
                : sort == "top"
                    ? model.getTopThreadsByBranch
                    : sort == "new"
                        ? model.getNewThreadsByBranch
                        : model.getHotThreadsByBranch;
            let viewData = Object.assign({}, await utils.createViewData(cookies), { postableBranch: false, showThreadSource: true, pageNumber: pageNumber, overview: overview, hideThreads: hideThreads, sort: sort, branch: {
                    name: utils.config.homeTitle || "",
                    description: utils.config.homeDescription || "",
                    isHome: true
                }, threads: await threadGetter(undefined, user, pageNumber) });
            let html = utils.renderTemplate("views/branch.njk", viewData);
            res.end(html);
        }
        // BRANCH PAGE
        else if (url[0] == "branch") {
            handleWith(branch_1.handleBranch);
        }
        // NEW BRANCH
        else if (url[0] == "newBranch") {
            let viewData = Object.assign({}, await utils.createViewData(cookies));
            let html = utils.renderTemplate("views/newBranch.njk", viewData);
            res.end(html);
        }
        // BRANCH LIST
        else if (url[0] == "branchList") {
            let branches = await Promise.all((await model.unsafeBranchList()).map(async (branch) => {
                return Object.assign({}, branch, { threadsCount: await model.getThreadsCountForBranch(branch) });
            }));
            let viewData = Object.assign({}, await utils.createViewData(cookies), { branches: branches, overviewBranches: utils.getOverviewBranches() });
            let html = utils.renderTemplate("views/branchList.njk", viewData);
            res.end(html);
        }
        // ADMIN CONFIG
        else if (url[0] == "config") {
            let user = await utils.getLoggedUser(cookies);
            if (user && utils.isAdmin(user.name)) {
                let viewData = Object.assign({}, await utils.createViewData(cookies), { urlStats: urlStats, serverNameValue: utils.getServerName(), adminsValue: utils.getAdmins().join(", "), blockNewInstancesValue: utils.getBlockNewInstances(), acceptSignUpValue: utils.getAcceptSignUp(), overviewBranchesJSON: JSON.stringify(utils.getOverviewBranches()), overviewHasThreads: utils.getOverviewHasThreads(), headHTMLValue: utils.getHeadHTML(), footerHTMLValue: utils.getFooterHTML(), customCSSValue: utils.getCustomCSS(), remoteInstances: await model.getRemoteInstances(), users: await model.getUserList() });
                let html = utils.renderTemplate("views/config.njk", viewData);
                res.end(html);
            }
            else {
                utils.endWithRedirect(res, "/");
            }
        }
        // INSTANCE
        else if (url[0] == "instance") {
            let user = await utils.getLoggedUser(cookies);
            let isAdmin = user && utils.isAdmin(user.name);
            let instance = await model.getRemoteInstanceByHost(url[1]);
            if (!instance) {
                res.end("Unknown instance");
            }
            else {
                let viewData = Object.assign({}, await utils.createViewData(cookies), { isAdmin,
                    instance });
                res.end(utils.renderTemplate("views/instance.njk", viewData));
            }
        }
        // INSTANCE LIST
        else if (url[0] == "instanceList") {
            let viewData = Object.assign({}, await utils.createViewData(cookies), { instanceList: await model.getRemoteInstances() });
            res.end(utils.renderTemplate("views/instanceList.njk", viewData));
        }
        // API V1 INSTANCE
        else if (url[0] == "api") {
            if (url[1] == "v1" && url[2] == "instance") {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    title: utils.getServerName()
                }));
            }
            else
                res.end("Error, unknown url");
        }
        // LOGIN PAGE
        else if (url[0] == "login") {
            let viewData = await utils.createViewData(cookies);
            let html = utils.renderTemplate("views/login.njk", viewData);
            res.end(html);
        }
        // SIGNUP PAGE
        else if (url[0] == "signup") {
            if (!utils.getAcceptSignUp()) {
                res.end("We do not accept registrations right now");
            }
            else {
                let viewData = await utils.createViewData(cookies);
                let html = utils.renderTemplate("views/signup.njk", viewData);
                res.end(html);
            }
        }
        // LOGOUT PAGE
        else if (url[0] == "logout") {
            if (cookies.session) {
                let session = await model.getSessionById(cookies.session);
                if (session) {
                    await model.deleteSession(session);
                }
            }
            utils.endWithRedirect(res, "/");
        }
        // THREAD PAGE
        else if (url[0] == "thread") {
            handleWith(thread_1.handleThread);
        }
        // COMMENT LINK
        else if (url[0] == "comment") {
            let commentId = url[1].indexOf("://") != -1 ? decodeURIComponent(url[1]) : utils.urlForPath("comment/" + url[1]);
            let comment = await model.getCommentById(commentId);
            if (comment) {
                for (;;) {
                    if (comment && comment.inReplyTo) {
                        let thread = await model.getThreadById(comment.inReplyTo);
                        if (thread) {
                            utils.endWithRedirect(res, thread.id);
                        }
                        else {
                            comment = await model.getCommentById(comment.inReplyTo);
                        }
                    }
                    else {
                        res.end("Error, finding comment thread");
                    }
                }
            }
            else {
                res.end("404 no such comment");
            }
        }
        else {
            res.end("404");
        }
    }
}).listen(utils.port || utils.realPort || 80);
