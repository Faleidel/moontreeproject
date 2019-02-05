import * as utils from "../utils";
import * as model from "../model";
const request = require("request");

export function handleUserInboxPost(url: string[], query: any, req: any, res: any, body: string, cookies: any){
    let user = url[1];
    
    let streamObject = JSON.parse(body);
    
    utils.log("STREAM OBJECT IN INBOX", "User", user, "Type", streamObject.type, "Content", streamObject.object.content);
    
    res.statusCode = 201;
    res.end();
}

export async function handleUserGet(url: string[], query: any, req: any, res: any, body: string, cookies: any) {
    let name = url[1];
    
    if (name.indexOf("@") == -1)
        name += "@" + utils.serverAddress;
    
    let user: model.User | undefined = await model.getUserByName(name);
    
    let asJson = !!query.json || (req.headers.accept.indexOf("json") != -1);
    
    if (asJson)
        res.setHeader('Content-Type', 'application/json');
    
    if (user) {
        let activitys: any = await model.getActivitysByAuthor(name) as any as model.Activity[];
        
        if (url.length == 2) {
            if (asJson) {
                res.end(JSON.stringify({
                    "@context": [
                        "https://www.w3.org/ns/activitystreams",
                        "https://w3id.org/security/v1"
                    ],
                    
                    "id": utils.urlForPath("user/" + name),
                    "type": "Person",
                    "preferredUsername": name,
                    "inbox": utils.urlForPath("user/" + name + "/inbox"),
                    "outbox": utils.urlForPath("user/" + name + "/outbox"),
                    
                    "publicKey": {
                        "id": utils.urlForPath("user/" + name + "#main-key"),
                        "owner": utils.urlForPath("user/" + name),
                        "publicKeyPem": user.publicKey
                    }
                }));
            } else {
                let viewData = {
                    ...await utils.createViewData(cookies),
                    accountName: name,
                    isBanned: (!!user.banned)+"",
                    activitys: (await Promise.all(activitys.map((a: model.Activity) => model.activityToJSON(a)))).filter((e: any) => !!e)
                };
                
                if (viewData.user && viewData.user.name == user.name) {
                    viewData.notifications = await model.getNotificationsByUser(viewData.user);
                }
                
                let html = utils.renderTemplate("views/account.njk" ,viewData);
                
                res.end(html);
            }
        }
        else if (url[2] == "outbox") {
            if (!query.page) {
                res.end(JSON.stringify({
                    "@context": [
                        "https://www.w3.org/ns/activitystreams"
                    ],
                    type: "OrderedCollection",
                    first: utils.urlForPath("user/" + name + "/outbox?page=true"),
                    last: utils.urlForPath("user/" + name + "/outbox?min_id=0&page=true"),
                    id: utils.urlForPath("user/" + name + "/outbox"),
                    totalItems: activitys.length
                }));
            }
            else {
                res.end(JSON.stringify({
                    "@context": [
                        "https://www.w3.org/ns/activitystreams"
                    ],
                    type: "OrderedCollectionPage",
                    id: utils.urlForPath("user/" + name + "/outbox?page=true"),
                    prev: utils.urlForPath("user/" + name + "/outbox?page=true"),
                    partOf: utils.urlForPath("user/" + name + "/outbox"),
                    orderedItems: await Promise.all(activitys.map(async (act: model.Activity) => {
                        return (await model.activityToJSON(act)).filter((e: any) => !!e);
                    }))
                }));
            }
        }
        else {
            res.end("No such url in user");
        }
    }
    else {
        res.end("Error, no such user");
    }
}
