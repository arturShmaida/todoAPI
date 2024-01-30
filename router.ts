const express = require("express");
let router = express.Router();

let { handleLogin, handleLogout, handleRegister, handelGetItems, handleDeleteItem, handleAddItem, handleEditItem } = require("./requestHandler.js");

router.all("/router", (request: any, response: Response) => {
    let requestedAction = request.query.action;

    switch (requestedAction) {
        case "login": {
            handleLogin(request, response);
            break;
        }
        case "logout": {
            handleLogout(request, response);
            break;
        }
        case "register": {
            handleRegister(request, response);
            break;
        }
        case "getItems": {
            handelGetItems(request, response);
            break;
        }
        case "deleteItem": {
            handleDeleteItem(request, response);
            break;
        }
        case "addItem": {
            handleAddItem(request, response);
            break;
        }
        case "editItem": {
            handleEditItem(request, response);
            break;
        }
    }
})


module.exports = { router };