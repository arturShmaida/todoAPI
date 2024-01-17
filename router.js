"use strict";
const express = require("express");
let router = express.Router();


router
    .all("",(request, response)=> {
        let requestedAction = request.query.action;
        console.log(requestedAction)
        switch(requestedAction){
            case "login": {
                dostuff(request, response);
                break;
            }
            case "logout": {
                dostuff(request, response);
                break;
            }
            case "register": {
                dostuff(request, response);
                break;
            }
            case "getItems": {
                dostuff(request, response);
                break;
            }
            case "deleteItem": {
                dostuff(request, response);
                break;
            }
            case "addItem": {
                dostuff(request, response);
                break;
            }
            case "editItem": {
                dostuff(request, response);
                break;
            }
        }

        response.json({string:"fuck you"})
    })

module.exports = router;