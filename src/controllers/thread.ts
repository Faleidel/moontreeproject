import * as utils from "../utils";
import * as model from "../model";
const request = require("request");

export async function handleThread(url: string[], query: any, req: any, res: any, body: string, cookies: any){
    if (url[1]) {
        let threadId = url[1].indexOf("://") != -1 ? decodeURIComponent(url[1]) : utils.urlForPath("thread/" + url[1]);
        
        let asJson = !!query.json || (req.headers.accept && (req.headers.accept.indexOf("json") != -1));
        if (asJson)
            res.setHeader("Content-Type", "application/ld+json");
        
        let thread = await model.getThreadById(threadId);
        
        if (thread) {
            if (asJson) {
                let threadJSON = {
                    ... await model.threadToJSON(thread),
                    
                    childrens: await Promise.all((await model.getThreadFlatComments(thread)).map(model.commentToJSON))
                };
                
                res.end(JSON.stringify(threadJSON));
            } else {
                let branch = await model.getBranchByName(thread.branch);
            
                let user = await utils.getLoggedUser(cookies);
                
                if (branch) {
                    let viewData: any = {
                        ...await utils.createViewData(cookies),
                        thread: thread,
                        branch: branch,
                        isBranchAdmin: await model.isBranchAdmin(user, branch),
                        commentTree: await model.getThreadCommentsForClient(user, thread.id)
                    };
                    
                    let theme = query.theme || "";
                    
                    if (theme)
                        theme = theme + "-";
                    
                    res.end(utils.renderTemplate("views/"+theme+"thread.njk", viewData));
                }
                else
                    res.end("Error finding branch");
            }
        }
        else
            res.end("404 thread not found");
    } else {
        res.end("404 no thread id");
    }
}
