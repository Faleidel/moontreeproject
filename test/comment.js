const { Builder, By, Key, until } = require('selenium-webdriver');
let newUser = require("./newUser");
let thread = require("./thread");
let utils = require("./utils");

async function newTopComment() {
    await newUser.baseLogin();
    
    await utils.test("create top comment on thread", async driver => {
        await thread.goToThread();
        
        await utils.screenShot();
        
        let content = Math.random() + "";
        
        let form = await driver.findElement(By.css("form#newComment"));
        
        // input thread content
        await (await form.findElement(By.css('textarea[name="content"]')))
        .sendKeys(content);
        
        // submit form
        (await form.findElement(By.css('[type="submit"][value="send"]'))).click();
        
        await utils.screenShot();
        
        await utils.sleep(100);
        
        let comments = await Promise.all((await driver.findElements(By.css(".comment .content"))).map(async comment => ({
            text: await comment.getText(),
            element: comment
        })));
        
        let el = comments.find(c => c.text == content);
        
        if (!el) {
            throw new Error("Comment text missing");
        } else {
            await utils.screenShot("", el.element);
        }
    });
}

exports.run = async function() {
    await utils.test("Run comment", async driver => {
        await newTopComment();
        
        await newUser.logout();
    });
}
