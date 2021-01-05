const {Builder, By, Key, until} = require('selenium-webdriver');
let utils = require("./utils");

async function runLoginTest(user, password) {
    await utils.test("login", async (driver) => {
        await driver.get(utils.baseUrl);
        
        // click login
        let loginLink = await driver.findElement(By.id("login"));
        await loginLink.click();
        
        await utils.sleep(1000);
        await utils.screenShot();
        
        // enter user name
        let userInput = await driver.findElement(By.css('[type="user"][name="user"]'));
        await userInput.sendKeys(user);
        await utils.screenShot();
        
        // enter password
        let passwordInput = await driver.findElement(By.css('[type="password"][name="password"]'));
        await passwordInput.sendKeys(password);
        
        // click login
        (await driver.findElement(By.css('[type="submit"][value="Login"]'))).click();
        await utils.sleep(1000);
        
        let hasLogout = await driver.findElements(By.id("logout"));
        if (hasLogout.length == 0) {
            await utils.screenShot("_error");
            throw new Error("Loggin didn't work.");
        }
    });
}

async function createUser(user, password) {
    await utils.test("signup", async (driver) => {
        await driver.get(utils.baseUrl);
        
        // click login
        let signupLink = await driver.findElement(By.id("signup"));
        await signupLink.click();
        
        await utils.sleep(1000);
        await utils.screenShot();
        
        // enter user name
        let userInput = await driver.findElement(By.css('[type="user"][name="user"]'));
        await userInput.sendKeys(user);
        await utils.screenShot();
        
        // enter password
        let passwordInput = await driver.findElement(By.css('[type="password"][name="password"]'));
        await passwordInput.sendKeys(password);
        let passwordInput2 = await driver.findElement(By.css('[type="password"][name="password2"]'));
        await passwordInput2.sendKeys(password);
        
        // click login
        (await driver.findElement(By.css('[type="submit"][value="Create"]'))).click();
        await utils.sleep(1000);
        
        await utils.screenShot();
        
        let hasLogout = await driver.findElements(By.id("logout"));
        if (hasLogout.length == 0) {
            await utils.screenShot("_error");
            throw new Error("Loggin didn't work.");
        } else {
            await hasLogout[0].click();
            await utils.sleep(1000);
        }
        console.log("Signup over");
    });
}

exports.run = async function () {
    let user = "testUser" + Math.random();
    let password = "testUser" + Math.random();
    console.log("Create user");
    await createUser(user, password);
    
    console.log("Login user");
    await runLoginTest(user, password);
}
