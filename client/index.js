const express = require("express");

const app = express();

app.use(express.static("public"));
const port = 5050;
const hostName = "127.0.0.1";
app.listen({port,hostName}, (err) => {
    if (err) {
        console.log("Error occured", err);
        return;
    }
    console.log(`Listening on port ${port}`)
})

