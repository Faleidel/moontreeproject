import * as http from "http";
import * as urlUtils from "url";
import * as utils from "./utils";
import * as model from "./model";
import * as fs from "fs";
import * as queryString from "querystring";

import { handleUserInboxPost, handleUserGet } from "./controllers/user";
import { handleLoginPost } from "./controllers/login";
import { handleSignupPost } from "./controllers/signup";
import { handleWellKnownGet } from "./controllers/wellKnown";
import { handleThread } from "./controllers/thread";
import { handleBranch } from "./controllers/branch";

const { generateKeyPair } = require("crypto");

const request = require("request");

//function newPost(from: string, to: string | undefined, content: string): any {
//    let user = store.users[from];
//    
//    if (user) {
//        let post = {
//            id: Math.random()*100000000000000000,
//            type: "Note",
//            content: content,
//            published: new Date().toISOString(),
//            to: "https://www.w3.org/ns/activitystreams#Public",
//            inReplyTo: "https://mastodon.social/users/" + to
//        };
//        
//        let act = {
//            id: Math.random()*100000000000000000,
//            type: "Create",
//            to: ["https://www.w3.org/ns/activitystreams#Public"],
//            actor: utils.urlForPath("/user/testUser"),
//            published: new Date().toISOString(),
//            object: post.id
//        };
//        
//        store.posts[post.id] = post;
//        store.activitys[act.id] = act;
//        
//        user.posts.push(act.id);
//        
//        saveStore();
//        
//        return act;
//    }
//}

let urlStats: {[key: string]: number} = {};
fs.readFile("urlStats.json", "utf-8", (err, data) => {
    if (data) {
        urlStats = JSON.parse(data);
    }
    setInterval(() => {
        fs.writeFile("urlStats.json", JSON.stringify(urlStats, undefined, 4), () => {});
    }, 1000);
});

model.loadStore(() => {});

http.createServer(async function (req: any, res) {
    let parsed = urlUtils.parse(req.url, true);
    let query = parsed.query;
    let url = parsed.pathname!.split("/");
    if (url[0] == "") url.splice(0,1);
    if (url[url.length-1] == "") url.splice(url.length-1,1);
    
    if (!urlStats[url.join("/")])
        urlStats[url.join("/")] = 0;
    urlStats[url.join("/")] += 1;
    
    let cookies: any = {};
    if (req.headers.cookie)
        cookies = utils.parseCookies(req.headers.cookie);
    
    console.log("Url:", url);
    utils.log("Url:", url, req.headers);
    
    if (req.method == "POST") {
        let body = '';
        req.on('data', (chunk: any) => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            function handleWith(f: Function) {
                f(url, query, req, res, body, cookies);
            }
            
            // POST ROUTES
            if (url[0] == "user") {
                if (url[2] == "inbox") {
                    handleWith(handleUserInboxPost);
                }
                else
                    res.end('error');
            }
            else if (url[0] == "login") {
                handleWith(handleLoginPost);
            }
            else if (url[0] == "signup") {
                handleWith(handleSignupPost);
            }
            else if (url[0] == "setConfig") {
                let user = await utils.getLoggedUser(cookies);
                
                if (user && utils.isAdmin(user.name)) {
                    let {serverName, admins, blockNewInstances, acceptSignUp, headHTML, footerHTML, customCSS, overviewBranchesJSON, overviewHasThreads} = queryString.parse(body) as any;
                    
                    utils.setServerName(serverName);
                    utils.setAdmins(admins.split(",").map((s: string) => s.replace(/ /g, "")));
                    utils.setAcceptSignUp( acceptSignUp == "true" );
                    utils.setBlockNewInstances( blockNewInstances == "true" );
                    utils.setHeadHTML( headHTML );
                    utils.setFooterHTML( footerHTML );
                    utils.setCustomCSS( customCSS );
                    utils.setOverviewBranches( JSON.parse(overviewBranchesJSON) );
                    utils.setOverviewHasThreads( overviewHasThreads == "true" );
                    
                    utils.endWithRedirect(res, "/config");
                } else {
                    utils.endWithRedirect(res, "/");
                }
            }
            else if (url[0] == "branchConfig") {
                let user = await utils.getLoggedUser(cookies);
                
                if (user) {
                    let {pinedThreads, branch} = queryString.parse(body) as any;
                    
                    let pinedThreadsList = pinedThreads.split(",").map((s: string) => s.replace(/ /g, ""));
                    
                    let branchO = await model.getBranchByName(branch);
                    
                    if (branchO && model.isBranchAdmin(user, branchO)) {
                        model.setBranchPinedThreads(branchO, pinedThreadsList);
                        
                        utils.endWithRedirect(res, "/branch/"+ branch);
                    }
                }
            }
            else if (url [0] == "branchAdmin") {
                let user = await utils.getLoggedUser(cookies);
                
                if (user && utils.isAdmin(user.name)) {
                    let {branch} = queryString.parse(body) as any;
                    
                    model.banBranch(branch);
                    utils.endWithRedirect(res, "/");
                }
                else
                    utils.endWithRedirect(res, "/");
            }
            else if (url[0] == "adminRemoveComment") {
                let user = await utils.getLoggedUser(cookies);
                let {branchName, id} = queryString.parse(body) as any;
                
                let branch = await model.getBranchByName(branchName);
                
                if (user && branch && (utils.isAdmin(user.name) || await model.isBranchAdmin(user, branch))) {
                    model.adminDeleteComment(id);
                    utils.endWithRedirect(res, "/branch/"+branchName);
                }
                else
                    utils.endWithRedirect(res, "/");
            }
            else if (url[0] == "banUser") {
                let user = await utils.getLoggedUser(cookies);
                let {name} = queryString.parse(body) as any;
                
                if (user && utils.isAdmin(user.name)) {
                    model.banUser(name);
                    res.end("User banned");
                }
                else
                   utils.endWithRedirect(res, "/");
            }
            else if (url[0] == "instanceBlockStatus") {
                let user = await utils.getLoggedUser(cookies);
                
                if (user && utils.isAdmin(user.name)) {
                    let {host, block} = queryString.parse(body) as any;
                    
                    let instance = await model.getRemoteInstanceByHost(host);
                    
                    if (instance) {
                        model.setRemoteInstanceBlockedStatus(instance, block == "true");
                        utils.endWithRedirect(res, "/instance/"+host);
                    }
                    else
                        res.end("Invalid instance");
                }
            }
            else if (url[0] == "like") {
                let object = await model.getCommentById(body) || await model.getThreadById(body);
                let user = await utils.getLoggedUser(cookies);
                
                if (object && user) {
                    model.createLike(user, object);
                }
            }
            else if (url[0] == "unlike") {
                let object = await model.getCommentById(body) || await model.getThreadById(body);
                let user = await utils.getLoggedUser(cookies);
                
                if (object && user) {
                    model.deleteLikeOfOn(user, object);
                }
            }
            else if (url[0] == "readNotification") {
                let id = body;
                
                let notification = await model.getNotificationsById(id);
                
                if (notification) {
                    model.setNotificationRead(notification);
                }
                res.end("ok");
            }
            else if (url[0] == "newBranch") {
                let {name, description} = queryString.parse(body) as any;
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
                        let branch = model.createBranch(name, description, [], user);
                        
                        if (branch) {
                            utils.endWithRedirect(res, "/branch/" + name);
                        } else {
                            res.end("Could not create branch");
                        }
                    } else {
                        res.end(errors.join("</br>"));
                    }
                } else {
                    res.end("Error with branch name or not logged in");
                }
            }
            else if (url[0] == "newThread") {
                let {title, content, branch, id} = queryString.parse(body) as any;
                
                let user = await utils.getLoggedUser(cookies);
                
                if (user) {
                    let errors = [];
                    
                    if (content.length > 10000)
                        errors.push("Error, content is too long");
                    if (!id && title.length > 200) {
                        errors.push("Error, title is too long");
                    }
                    
                    if (errors.length == 0) {
                        if (!id) {
                            let thread = await model.createThread(user, title as string, content as string, branch as string);
                            utils.endWithRedirect(res, thread.id);
                        } else {
                            let thread = await model.getThreadById(id);
                            
                            if (thread) {
                                if (thread.author == user.name) {
                                    model.updateThread(thread, content);
                                    utils.endWithRedirect(res, thread.id);
                                } else {
                                    res.end("you are not the author of this post");
                                }
                            } else {
                                res.end("trying to edit a thread that does not exist");
                            }
                        }
                    } else {
                        res.end(errors.join("</br>"));
                    }
                }
                else {
                    res.end("Not logged in");
                }
            }
            else if (url[0] == "newComment") {
                let {content, threadId, objectId, backUrl, id} = queryString.parse(body) as any;
                backUrl = decodeURIComponent(backUrl as string);
                
                let user = await utils.getLoggedUser(cookies);
                
                if (user) {
                    let errors = [];
                    
                    if (content.length > 10000)
                        errors.push("Error, comment is too long");
                    
                    if (id) {
                        let comment = await model.getCommentById(id);
                        
                        if (comment) {
                            if (comment.author == user.name) {
                                model.updateComment(comment, content);
                                utils.endWithRedirect(res, backUrl);
                            } else {
                                res.end("Error, can't edit a comment that is not yours");
                            }
                        } else {
                            res.end("Error, editing unknown comment");
                        }
                        
                        return;
                    }
                    
                    threadId = decodeURIComponent(threadId as string);
                    objectId = decodeURIComponent(objectId as string);
                    
                    if (errors.length == 0 && (threadId || objectId)) {
                        let objectT = await model.getThreadById(threadId as string);
                        let objectC = await model.getCommentById(objectId as string);
                        if (objectT || objectC) {
                            let obj: any = objectC || objectT;
                            let comment = await model.createComment(user, content as string, obj.id);
                            let activity = await model.createActivity(user, comment);
                            utils.endWithRedirect(res, backUrl);
                        } else {
                            console.log("Error, lacks threadId or objectId", threadId, objectId);
                        }
                    } else if (errors.length != 0) {
                        res.end(errors.join("</br>"));
                    } else {
                        res.end("Error while creating comment, parent is null");
                    }
                }
                else {
                    res.end("Not logged in");
                }
            }
            else if (url[0] == "inbox") {
                console.log("GOT SOMETHING IN INBOX");
                
                let json = JSON.parse(body);
                if (json["@context"].some((c: string) => c == "ironTreeThread")) {
                    let thread = await model.threadFromJSON(json);
                    
                    if (thread)
                        model.saveThread(thread);
                    else
                        console.log("Error with remote comment", body);
                    
                    res.end("ok thread");
                
                } else {
                    let comment = await model.commentFromJSON(json);
                    
                    if (comment)
                        model.saveComment(comment);
                    else
                        console.log("Error with remote comment", body);
                    
                    res.end("ok comment");
                }
            }
            else
                res.end('error');
        });
    }
    else {
        function handleWith(f: Function) {
            f(url, query, req, res, "", cookies);
        }
        
        // ROUTES GET
        if (url[0] == "user") {
            handleWith(handleUserGet);
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
            }, (err: any, resp: any, body: any) => {
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
            handleWith(handleWellKnownGet);
        }
        else if (url[0] == "static") {
            if (url[1].indexOf(".png") == -1) {
                if (url[1].indexOf(".svg") != -1)
                    res.setHeader('Content-Type', 'image/svg+xml');
                
                fs.readFile("static/"+url[1], "utf-8", (err, data) => {
                    res.end(data);
                })
            } else {
                fs.readFile("static/"+url[1], (err, data) => {
                    res.end(data);
                })
            }
        }
        else if (url[0] == "favicon.ico") {
            fs.readFile("static/favicon.png", (err, data) => {
                res.end(data);
            })
        }
        // HOME PAGE
        else if (url.length == 0 || url[0] == "all") {
            let user = await utils.getLoggedUser(cookies);
            
            let pageNumber = parseInt(query.page as any, 10) || 0;
            
            let overview = undefined;
            if (url[0] != "all" && pageNumber == 0) {
                overview = utils.getOverviewBranches();
            }
            
            let hideThreads = false;
            if (overview && !utils.getOverviewHasThreads())
                hideThreads = true;
            
            let sort = query.sort as string;
            
            let threadGetter = sort == "hot"
                               ? model.getHotThreadsByBranch
                               : sort == "top"
                               ? model.getTopThreadsByBranch
                               : sort == "new"
                               ? model.getNewThreadsByBranch
                               : model.getHotThreadsByBranch;
            
            let viewData: any = {
                ... await utils.createViewData(cookies),
                postableBranch: false,
                showThreadSource: true,
                pageNumber: pageNumber,
                overview: overview,
                hideThreads: hideThreads,
                sort: sort,
                branch: {
                    name: utils.config.homeTitle || "",
                    description: utils.config.homeDescription || "",
                    isHome: true
                },
                threads: await threadGetter(undefined, user, pageNumber)
            };
            
            let html = utils.renderTemplate("views/branch.njk", viewData);
            res.end(html);
        }
        // BRANCH PAGE
        else if (url[0] == "branch") {
            handleWith(handleBranch);
        }
        // NEW BRANCH
        else if (url[0] == "newBranch") {
            let viewData: any = {
                ... await utils.createViewData(cookies),
            };
            
            let html = utils.renderTemplate("views/newBranch.njk", viewData);
            res.end(html);
        }
        // BRANCH LIST
        else if (url[0] == "branchList") {
            let branches = await Promise.all((await model.unsafeBranchList()).map(async (branch) => {
                return { ...branch
                       , threadsCount: await model.getThreadsCountForBranch(branch)
                       };
            }));
            
            let viewData: any = {
                ... await utils.createViewData(cookies),
                branches: branches,
                overviewBranches: utils.getOverviewBranches()
            };
            
            let html = utils.renderTemplate("views/branchList.njk", viewData);
            res.end(html);
        }
        // ADMIN CONFIG
        else if (url[0] == "config") {
            let user = await utils.getLoggedUser(cookies);
            
            if ( user && utils.isAdmin(user.name)) {
                let viewData: any = {
                    ... await utils.createViewData(cookies),
                    
                    urlStats: urlStats,
                    
                    serverNameValue: utils.getServerName(),
                    adminsValue: utils.getAdmins().join(", "),
                    blockNewInstancesValue: utils.getBlockNewInstances(),
                    acceptSignUpValue: utils.getAcceptSignUp(),
                    overviewBranchesJSON: JSON.stringify(utils.getOverviewBranches()),
                    overviewHasThreads: utils.getOverviewHasThreads(),
                    headHTMLValue: utils.getHeadHTML(),
                    footerHTMLValue: utils.getFooterHTML(),
                    customCSSValue: utils.getCustomCSS(),
                    remoteInstances: await model.getRemoteInstances(),
                    users: await model.getUserList()
                };
                
                let html = utils.renderTemplate("views/config.njk", viewData);
                res.end(html);
            } else {
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
            } else  {
                let viewData: any = {
                    ... await utils.createViewData(cookies),
                    isAdmin,
                    instance
                };
                
                res.end(utils.renderTemplate("views/instance.njk", viewData));
            }
        }
        // INSTANCE LIST
        else if (url[0] == "instanceList") {
            let viewData: any = {
                ... await utils.createViewData(cookies),
                instanceList: await model.getRemoteInstances()
            };
            
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
            } else {
                let viewData = await utils.createViewData(cookies);
                let html = utils.renderTemplate("views/signup.njk", viewData);
                res.end(html);
            }
        }
        // LOGOUT PAGE
        else if (url[0] == "logout") {
            if (cookies.session) {
                let session = await model.getSessionById(cookies.session as string);
                if (session) {
                    await model.deleteSession(session);
                }
            }
            
            utils.endWithRedirect(res, "/");
        }
        // THREAD PAGE
        else if (url[0] == "thread") {
            handleWith(handleThread);
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
                        } else {
                            comment = await model.getCommentById(comment.inReplyTo);
                        }
                    } else {
                        res.end("Error, finding comment thread");
                    }
                }
            } else {
                res.end("404 no such comment");
            }
        }
        else {
            res.end("404");
        }
    }
}).listen(utils.port || utils.realPort || 80);
