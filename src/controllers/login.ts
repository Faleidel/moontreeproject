import * as utils from "../utils";
import * as model from "../model";

import * as queryString from "querystring";


export async function handleLoginPost(url: string[], query: any, req: any, res: any, body: string, cookies: any) {
    let {user, password} = queryString.parse(body) as any;
    
    user = user + "@" + utils.serverAddress;
    
    let userObject = await model.getUserByName(user);
    if (   userObject
        && !userObject.banned
        && userObject.local
        && userObject.local
        && await utils.hashPassword(password, userObject.passwordSalt) == userObject.passwordHashed
    ) {
        let session = await model.createSession();
        await model.loginSession(session, userObject);
        res.setHeader("Set-Cookie", utils.stringifyCookies({
            session: session.id
        }));
        
        utils.log("User ", user, "login with headers:", req.headers);
        utils.endWithRedirect(res, "/");
    }
    else {
        console.log("Error, no such user", user);
        res.end("Could not login");
    }
}
