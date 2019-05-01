import * as utils from "../utils";
import * as model from "../model";

import * as queryString from "querystring";

export async function handleWellKnownGet(url: string[], query: any, req: any, res: any, body: string, cookies: any) {
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
                            "href": utils.urlForPath("branch/" + userName + "@b@" + utils.host)
                        }]
                    }));
                } else {
                    res.end("Error");
                }
            }
        }
    }
    else
        res.end("Error with url");
}
