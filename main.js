// AUTKMAN - Authentik User Manager
// (c) 2023, Raskitoma.io

// Simple program to interface with authentik to allow users on a specific group give/denied access to new registered users.

const express = require('express');
const path = require('path');
const https = require('https');
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const axios = require('axios');
const moment = require('moment');
const app = express();
const dotenv = require('dotenv');
const host = '0.0.0.0'
const app_name = 'AUTKMAN'

// setting up view engine
app.set('view engine', 'ejs');

// load environment variables
console.log('Loading environment variables...');
dotenv.config();
const port = process.env.APP_PORT || 3000;
const pacemaker_uri = process.env.APP_HEALTHCHECK_URI || `https://raskitoma.com`; // default to my site
const pacemaker_interval = process.env.APP_HEALTHCHECK_INTERVAL || 300; // 5 minutes default
const appdebug = process.env.APP_DEBUG || '0'; // default to false
const authentik_server = process.env.AUTHENTIK_SERVER || 'http://authentik:9000/api/v3/'; // default to http://authentik:9000/api/v3/
const authentik_token = process.env.AUTHENTIK_TOKEN || 'NOTOKEN'; // default to NOTOKEN
const manager_group = process.env.AUTHENTIK_MANAGER_GROUP || 'ADMIN'; // default to group ADMIN
const newuser_group = process.env.AUTHENTIK_NEWUSER_GROUP || 'MAIN'; // default to group MAIN
const desuser_group = process.env.AUTHENTIK_DESUSER_GROUP || 'DESUSER'; // default to group DESUSER
const blocked_group = process.env.AUTHENTIK_BLOCKED_GROUP || 'BLOCKED'; // default to group BLOCKED
console.log('Environment variables loaded.');

// Setting up logger
function applogger(message, module='MSG', severity='info', extras='', request=null, response=null) {
    let time_now = moment().format();
    let method = 'SCRIPT';
    let browser = 'SCRIPT';
    let uri = 'SCRIPT';
    let ip = 'SCRIPT';
    let status_code = 0;
    if (request) {
        method = request.method || 'SCRIPT';
        browser = request.rawHeaders[15] || 'SCRIPT';
        uri = request.url || 'SCRIPT';
        ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress || 'SCRIPT';
    }
    if (response) {
        if (response.statusCode) {
        status_code = response.statusCode;
        } else if (response.status) {
        status_code = response.status;
        }
    }
    let log_msg = `${time_now} | [${app_name}]-[${module}][${method}][${status_code}][${message}][${uri}][${ip}][${browser}][${extras}]`;
    if (severity == 'error') {
        console.error(log_msg);
    } else if (severity == 'warn') {
        console.warn(log_msg);
    }  else {
        console.log(log_msg);
    }
}
  
// set pacemaker function
console.log('Setting up pacemaker...');
function pacemaker() {
    https.get(pacemaker_uri, function(res) {
        applogger('SUCCESS - Contact Healthcheck', 'PACEMAKER', 'info', `PACEMAKER INTERVAL: ${pacemaker_interval}`, null, res);
    })
    .on('error', function(e) {
        applogger('ERROR - Healthcheck', 'PACEMAKER', 'error', `PACEMAKER INTERVAL: ${pacemaker_interval}`, null, res);
    });
}

// funtion to get uuid for an specific group
async function get_uuid(group) {
    let autk_route = 'core/groups/';
    let url = `${authentik_server}${autk_route}`;
    // set authrorization header to Bearer token
    let headers = {
        'Authorization': `Bearer ${authentik_token}`
    }
    try {
        let response = await axios.get(url, {headers: headers});
        let groups = response.data.results;
        let group_uuid = '';
        for (const element of groups) {
            if (element.name == group) {
                group_uuid = element.pk;
                break;
            }
        }
        return group_uuid;
    } catch (error) {
        applogger(`ERROR - ${error}`, 'GETUUID', 'error', `GROUP: ${group}`);
        return '';
    }
}


// cors fix
let allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', '*');
    next();
};


// set up express server
console.log('Setting up express server...');
app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

console.log('Mounting/Loading required modules...')
app.use('/lib',express.static(path.join(__dirname, "node_modules/")));

// *********************************************************************************************************************
// APP Routes
  console.log('Prepping app routes...')
// Root route
app.get('/', (req, res) => {
  const is_debug = appdebug=='1' ? '**DEBUG ENABLED** ' : '';	
  applogger(`${is_debug}Client Request`, 'REQUEST', 'info', '', req, res);
  res.render('index', {appdebug:appdebug});
});

// get list of groups
app.get('/getgroups', (req, res) => {
    let autk_route = 'core/groups/';
    let url = `${authentik_server}${autk_route}`;
    // set authrorization header to Bearer token
    let headers = {
        'Authorization': `Bearer ${authentik_token}`
    }

    // get groups from authentik
    axios.get(url, {headers: headers})
    .then(function (response) {
        let groups = response.data;
        res.send(groups);
    })
    .catch(function (error) {
        console.log(error);
    });
    
});

// get pending users
app.get('/getusers', (req, res) => {
    let user_kind = req.query.kind;
    let autk_route = 'core/users/';
    let group = null;
    switch (user_kind) {
        case 'pending':
            // code to execute when user_kind is 'pending'
            group = newuser_group;
            break;
        case 'approved':
            group = desuser_group;
            break;
        case 'blocked':
            group = blocked_group;
            break;
        default:
            return res.send('Invalid parameters', 400);
    }
    let url = `${authentik_server}${autk_route}`;
    // set authrorization header to Bearer token
    let headers = {
        'Authorization': `Bearer ${authentik_token}`
    }
    // get users from authentik
    axios.get(url, {headers: headers})
    .then(function (response) {
        let users = response.data.results;
        let selected_users = [];
        users.forEach((user, index) => {
            if (user.groups_obj.find(obj => obj.name === group)) {
                console.log(`User ${user.username} is in group ${group}`);
                let user_object = {
                    "username" : user.username,
                    "name" : user.name,
                    "email" : user.email,
                    "last_login" : user.last_login,
                    "uid" : user.uid,
                    "pk" : user.pk,
                }
                selected_users.push(user_object);
            }
        });
        let users_result = {
            "data" : selected_users,
        }
        res.status(200).json(users_result);
    })
    .catch(function (error) {
        console.log(error);
    });
});

// Change user group action
app.post('/atkaction', async (req, res) => {
    // getting post data
    let action = req.body.action;
    let pk = parseInt(req.body.pk);
    let username = req.body.name
    let headers = {
        'Authorization': `Bearer ${authentik_token}`,
        'Content-Type': 'application/json'
    }
    let json = JSON.stringify({
        "pk": pk,
    });

    let old_group = null;
    let new_group = null;
    switch (action) {
        case 'approve':
            // code to execute when action is 'approve'
            old_group = newuser_group;
            new_group = desuser_group;
            break;
        case 'block':
            // code to execute when action is 'block'
            old_group = newuser_group;
            new_group = blocked_group;
            break;
        case 'enable':
            // code to execute when action is 'enable'
            old_group = blocked_group;
            new_group = desuser_group;
            break;
        case 'disable':
            // code to execute when action is 'disable'
            old_group = desuser_group;
            new_group = blocked_group;
            break;
    }

    let old_group_uuid = await get_uuid(old_group);
    let new_group_uuid = await get_uuid(new_group);

    // First, set paths
    let url_rem_group = `${authentik_server}core/groups/${old_group_uuid}/remove_user/`;
    let url_add_group = `${authentik_server}core/groups/${new_group_uuid}/add_user/`;

    // send requests'
    try {
        let response = await axios.post(url_add_group, json, {headers: headers});
        let action_1 = `User ${username} added to group ${new_group}`
        console.log(action_1, response);
        let response2 = await axios.post(url_rem_group, json, {headers: headers});
        let action_2 = `and removed from group ${old_group}`
        console.log(action_2, response2);
        res.status(200).json({'message': `${action_1} and ${action_2}`});
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }

});


// *********************************************************************************************************************

console.log('Mounting assets...')
app.use('/assets', express.static(path.join(__dirname, '/assets')));

// Ping the healthcheck server every x minutes
console.log('Ping Healtcheck Startup...')
pacemaker();
setInterval(pacemaker, pacemaker_interval * 1000);

console.log('Starting up express server...')
app.listen(port, host, () => {
  const time_now = moment().format();
  console.log(`${app_name} - System Live & Listening on http://${host}:${port} ======: ${time_now} :=====`);
});