# googledrive
Google Drive fs for node.js

## Install
```sh
npm i --save googledrive
```

## Example
This example get root folder files.

```js
"use strict";

const GoogleDrive = require("googledrive");

let googleDrive = new GoogleDrive({
    path: {
        client: path.join(__dirname, "settings/client.json"),
        token: path.join(__dirname, "settings/token.json")
    }
});

googleDrive.loadClient().then(() => {
    return googleDrive.authorize();
}).then(() => {
    return googleDrive.getRootFolder();
}).then(rootFolder => {
    return rootFolder.childFiles();
}).then(childFiles => {
    childFiles.forEach(childFile => {
        console.log(childFile);
    });
}).catch(err => {
    console.error(err);
});
```

This example upload file with resumable.

```js
"use strict";

const fs = require("fs");
const path = require("path");
const GoogleDrive = require("googledrive");

let googleDrive = new GoogleDrive({
    path: {
        client: path.join(__dirname, "settings/client.json"),
        token: path.join(__dirname, "settings/token.json")
    }
});

let src = "./foo/bar/baz.mp4";

googleDrive.loadClient().then(() => {
    return googleDrive.authorize();
}).then(() => {
    return googleDrive.getRootFolder();
}).then(rootFolder => {
    return rootFolder.uploadFileResumable(
        path.parse(src).base,   // name
        "video/mp4",            // mimeType
        fs.statSync(src).size,  // size
        position => {           // readableCallback
            return fs.createReadStream(src, { start: position });
        }
    );
}).then(() => {
    console.log("done");
}).catch(err => {
    console.error(err);
});
```
