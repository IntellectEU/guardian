const axios = require("axios");
const BASE_URL = 'http://localhost:3002'

let tokens = [
];

async function CreateAccount(username, password, role) {
    let account = await axios.post(
        GetURL('accounts', 'register'),
        {
            username,
            password,
            password_confirmation: password,
            role
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
            }
        }
    );
    delete account.data.did;
    delete account.data.iat;
    delete account.data._id;
    delete account.data.hederaAccountId;
    delete account.data.id;
    delete account.data.password;
    delete account.data.walletToken;
    delete account.data.createDate;
    delete account.data.updateDate;
    delete account.data.parent;
}

async function GenerateTokenStandardRegistry() {
    tokens = [];
    let result;
    result = await axios.post(
        GetURL('accounts', 'login'),
        JSON.stringify({
            username: 'StandardRegistry',
            password: 'test'
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(result.data.username, result.data.accessToken);
}

async function AccountsAlreadyExist() {
    try {
        const result = await axios.get(GetURL('accounts', ''), {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
            }
        });
        
        const expectedData = [
            { username: 'Installer' },
            { username: 'Installer2' },
            { username: 'Registrant' },
            { username: 'VVB' },
            { username: 'ProjectProponent' }
        ];
        
        const modifiedData = result.data.map(function(v) {
            delete v.did;
            delete v.parent;
            return v;
        });
        
        if (expectedData.every(function(expected) {
            return modifiedData.some(function(actual) {
                return JSON.stringify(actual) === JSON.stringify(expected);
            });
        })) {
            console.log('Accounts already exist');
            return true;
        } else {
            console.error('Accounts do not exist');
            return false;
        }
    } catch (error) {
        console.error('An error occurred:', error);
        return false;
    }
}

async function GenerateTokens() {
    tokens = [];
    let result;
    result = await axios.post(
        GetURL('accounts', 'login'),
        JSON.stringify({
            username: 'StandardRegistry',
            password: 'test'
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(result.data.username, result.data.accessToken);
    result = await axios.post(
        GetURL('accounts', 'login'),
        JSON.stringify({
            username: 'Installer',
            password: 'test'
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(result.data.username, result.data.accessToken);
    result = await axios.post(
        GetURL('accounts', 'login'),
        JSON.stringify({
            username: 'Installer2',
            password: 'test'
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(result.data.username, result.data.accessToken);
    result = await axios.post(
        GetURL('accounts', 'login'),
        JSON.stringify({
            username: 'Auditor',
            password: 'test'
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(result.data.username, result.data.accessToken);
}

function SaveToken(name, token) {
    tokens.push({token, name});
}

function GetToken(name) {
    return (tokens.find(t => t.name === name) || {}).token;
}

function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    })
}

function GetURL(service, ...methods) {
    console.log([BASE_URL, service, ...methods].join('/'));
    return [BASE_URL, service, ...methods].join('/');
}

function GenerateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = {
    sleep,
    GetURL,
    SaveToken,
    GetToken,
    GenerateTokens,
    GenerateUUIDv4,
    CreateAccount,
    GenerateTokenStandardRegistry,
    AccountsAlreadyExist
}
