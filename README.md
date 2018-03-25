# googledrive
Google Drive fs for node.js

## Install
```sh
npm i --save googledrive
```

## Example
```js
"use strict";

const fs = require("fs");
const util = require("util");
const readline = require("readline");
const GoogleDrive = require("googledrive");

/*
"client.json" is required.
See step1 of https://developers.google.com/drive/v3/web/quickstart/nodejs
*/

const path = {
    client: "path/to/client.json",
    token: "path/to/token.json",
    file: "path/to/file.mp4"
};

(async () => {
    // Read client and token
    let client = null;
    let token = null;

    client = JSON.parse(fs.readFileSync(path.client));

    try {
        token = JSON.parse(fs.readFileSync(path.token));
    } catch (err) {
        // Nothing
    }

    const googleDrive = new GoogleDrive({
        client: client,
        token: token
    });

    googleDrive.on("token", _token => {
        // Write token when getting and refreshing it
        fs.writeFileSync(path.token, JSON.stringify(_token));
    });

    if (token === null) {
        // Authorize
        const authUrl = googleDrive.generateAuthUrl();

        const code = await new Promise((resolve, reject) => {
            console.log(`Authorize URL: ${authUrl}`);

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question("Input your code: ", answer => {
                rl.close();

                if (answer === "") {
                    reject(new Error("Invalid code"));
                    return;
                }

                resolve(answer);
            });
        });

        await googleDrive.getToken(code);
    }

    // Get root folder
    const rootFolder = await googleDrive.getFolderById("root");

    // Find files in root folder
    const childFiles = await rootFolder.getChildFiles({
        query: "name contains 'foo'"
    });

    // Delete files
    for (const childFile of childFiles) {
        await childFile.delete();
    }

    // Create child file (File has not been created yet)
    const file = rootFolder.createChildFile({
        name: "file.mp4",
        mimeType: "video/mp4"
    });

    // Resumable upload
    await file.resumableCreate({
        contentLength: fs.statSync(path.file).size,
        readableCallback: position => fs.createReadStream(path.file, { start: position })
    });
})();
```
