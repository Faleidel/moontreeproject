const fs = require("fs");
const path = require("path");

// from path return list of path of files
function listFiles(dir, list) {
    list = list || [];
    
    fs.readdirSync(dir).forEach(file => {
        if (fs.statSync(path.join(dir, file)).isDirectory())
            list = listFiles(path.join(dir, file), list);
        else
            list.push(path.join(dir, file));
    });
    
    return list;
}

Promise.all(listFiles("src")
.filter(fileName => fileName.indexOf(".mts") == fileName.length - 4) // take only .mts files
.map(fileName => {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, "UTF-8", (err, data) => {
            let parts = data.split("meta interface ");
            
            if (parts.length > 1) {
                for (let x = 1 ; x < parts.length ; x++) {
                    let [inter, rest] = parts[x].split("end meta interface");
                    
                    let [header, ...interfaceJSON] = inter.split("{");
                    let [name, extendsKeyword, extendedInterface] = header.split(" ");
                    
                    let interfaceDefinition = eval("({"+interfaceJSON.join("{")+")");
                    
                    Object.keys(interfaceDefinition).map(key => {
                        let value = interfaceDefinition[key];
                        
                        if (value instanceof Array) {
                            interfaceDefinition[key] = {
                                ... value[1],
                                tsType: value[0]
                            };
                        } else {
                            interfaceDefinition[key] = {
                                tsType: value
                            };
                        }
                    });
                    
                    let interfaceTS =
                        "{\n"
                        + Object.keys(interfaceDefinition).map(key => `    ${key}: ${interfaceDefinition[key].tsType}`).join(",\n")
                        + "\n}";
                    
                    parts[x] = `let ${name}Definition = ${JSON.stringify(interfaceDefinition, null, 4)};\n\n`
                             + `interface ${name} ${extendedInterface ? `extends ${extendedInterface}` : ""} ${interfaceTS}\n\n`
                             + `${rest}`;
                }
            }
            
            let newName = fileName.substr(0, fileName.length-4) + ".ts";
            
            let file = "//WARNING, THIS FILE IS COMPUTER GENERATED, PLEASE REFER TO THE HUMAN VERSION AT " + fileName + "\n" + parts.join("\n");
            
            fs.writeFile(newName, file, resolve);
        })
    });
}));
