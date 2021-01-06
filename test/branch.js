const { Builder, By, Key, until } = require('selenium-webdriver');
let newUser = require("./newUser");
let utils = require("./utils");

exports.testBranch = Math.random() + "";
let createdTestBranch = false;

async function newBranch(branchName = exports.testBranch) {
    // login as a random user
    await newUser.baseLogin();
    
    await utils.test("new branch", async (driver) => {
        await driver.get(utils.baseUrl);
        
        // go to new branch page
        await (await driver.findElement(By.id("newBranch"))).click();
        
        await utils.screenShot();
        
        // input branch name
        await (await driver.findElement(By.css('[type="input"][name="name"]')))
        .sendKeys(branchName);
        
        // input branch description
        await (await driver.findElement(By.css('[name="description"]')))
        .sendKeys(branchName + " description");
        
        await utils.screenShot();
        
        // submit form
        (await driver.findElement(By.css('[type="submit"][value="Create"]'))).click();
        
        await utils.sleep(1000);
        await utils.screenShot("_created_branch");
        
        let titleText = await (await driver.findElement(By.css(".branchTitle"))).getText();
        let descriptionText = await (await driver.findElement(By.css(".description"))).getText();
        
        createdTestBranch = true;
        
        if (titleText != branchName || descriptionText != (branchName + " description")) {
            throw new Error("_error_title_or_description");
        }
    });
}

async function goToBranch() {
    await utils.test("go to basic branch", async driver => {
        if (!createdTestBranch)
            await newBranch();
        
        await driver.get(utils.baseUrl + "branch/" + exports.testBranch);
    });
}
exports.goToBranch = goToBranch;

async function findBranchInBranchList(branchName) {
    await utils.test("Check branch in branch list", async (driver) => {
        await driver.get(utils.baseUrl);
        
        // go to branch list page
        await (await driver.findElement(By.id("branchList"))).click();
        
        let branches = await Promise.all((await driver.findElements(By.css(".branchLink"))).map(async link => ({
            text: await link.getText(),
            element: link
        })));
        
        let element = branches.find(b => b.text == branchName);
        if (!element) {
            throw new Error("Could not find branch " + branchName + " in branch list");
        } else {
            await utils.screenShot("_element_in_list", element.element);
        }
    });
}

exports.run = async function() {
    await utils.test("Run branch", async driver => {
        await newBranch();
        await findBranchInBranchList(exports.testBranch);
        
        await newUser.logout();
    });
}
