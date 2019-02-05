import * as utils from "../utils";
import * as model from "../model";

import * as queryString from "querystring";


export async function handleSignupPost(url: string[], query: any, req: any, res: any, body: string, cookies: any) {
    if (!utils.getAcceptSignUp()) {
        res.end("We do not accept registrations right now");
        return;
    }
    
    let {user, password, password2} = queryString.parse(body) as {[key: string]: string};
    
    if (password == password2) {
        let errors = [];
        
        if (user != encodeURIComponent(user))
            errors.push("User name contains illegal characters");
        if (user.length > 40)
            errors.push("User name is too long");
        if (user.length < 3)
            errors.push("User name is too small, must be more then 2 characters");
        
        if (errors.length == 0) {
            await model.createUser(user as string, password as string)
            .then(async (worked) => {
                if (worked) {
                    let session = await model.createSession();
                    let userObject = await model.getUserByName((user + "@" + utils.serverAddress) as string) as model.User;
                    await model.loginSession(session, userObject);
                    res.setHeader("Set-Cookie", utils.stringifyCookies({
                        session: session.id
                    }));
                    
                    utils.endWithRedirect(res, "/");
                }
                else {
                    res.end("Could not create user");
                }
            });
        } else {
            res.end(errors.join("</br>"));
        }
    }
    else {
        // RETURN TO SIGNING WITH ERROR MESSAGE
        res.end("Passwords don't match");
    }
}
