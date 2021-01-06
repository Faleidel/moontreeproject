const { Builder, By, Key, until } = require('selenium-webdriver');
let newUser = require("./newUser");
let branch = require("./branch");
let utils = require("./utils");

let testThread = undefined;

async function newThread(title = Math.random()+"") {
    await newUser.baseLogin();
    
    await utils.test("new thread", async (driver) => {
        await branch.goToBranch();
        
        // input thread title
        await (await driver.findElement(By.css('.titleInput')))
        .sendKeys(title);
        
        // input thread content
        await (await driver.findElement(By.css('.contentInput')))
        .sendKeys(title + " content");
        
        // submit form
        (await driver.findElement(By.css('.threadCreation [type="submit"][value="Create"]'))).click();
        
        await utils.sleep(100);
        await utils.screenShot("_after_thread_creation");
        
        let titleContent = await (await driver.findElement(By.css(".threadTitle"))).getText();
        if (titleContent != title) {
            console.log("Bad title", titleContent);
            throw new Error("thread title is wrong");
        }
        
        let contentContent = await (await driver.findElement(By.css(".threadContent"))).getText();
        if (contentContent != (title + " content")) {
            console.log("Bad content", contentContent);
            throw new Error("thread content is wrong");
        }
        
        testThread = (await driver.getCurrentUrl()).split("/").reverse()[0];
    });
}

async function goToThread() {
    await utils.test("go to basic thread", async driver => {
        if (testThread == undefined)
            await newThread();
        else
            await driver.get(utils.baseUrl + "thread/" + testThread);
    });
}
exports.goToThread = goToThread;

exports.run = async function() {
    await utils.test("Run thread", async driver => {
        await newThread();
        
        await newUser.logout();
    });
}
