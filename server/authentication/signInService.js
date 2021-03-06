const superagent = require('superagent');
const querystring = require('querystring');

const config = require('../config');
const generateApiGatewayToken = require('./apiGateway');
const {generateOauthClientToken, generateBatchSystemOauthClientToken} = require('./oauth');
const logger = require('../../log');

const timeoutSpec = {
    response: config.nomis.timeout.response,
    deadline: config.nomis.timeout.deadline
};

function signInService(tokenStore) {

    return {

        signIn: async function(username, password) {

            logger.info(`Log in for: ${username}`);

            try {
                const {profile, role, token, refreshToken} = await login(username, password);
                tokenStore.store(username, role, token, refreshToken);

                return {
                    ...profile,
                    token,
                    refreshToken,
                    role,
                    username
                };

            } catch (error) {
                if (unauthorised(error)) {
                    logger.error(`Forbidden Elite2 login for [${username}]:`, error.stack);
                    return {};
                }

                logger.error(`Elite 2 login error [${username}]:`, error.stack);
                throw error;
            }
        },

        refresh: async function(username) {

            logger.info(`Token refresh for: ${username}`);

            const oldTokenObject = tokenStore.get(username);

            if (!oldTokenObject) {
                throw new Error('no token');
            }

            try {
                const {token, refreshToken} = await getBatchSystemClientCredentialsTokens(username);
                tokenStore.store(username, oldTokenObject.role, token, refreshToken);

            } catch (error) {
                if (unauthorised(error)) {
                    logger.error(`Forbidden Elite2 token refresh for [${username}]:`, error.stack);
                    return {};
                }

                logger.error(`Elite 2 token refresh error [${username}]:`, error.stack);
                throw error;
            }
        }
    };

    async function login(username, password) {

        const {token} = await getPasswordTokens(username, password);

        const [profile, role] = await Promise.all([
            getUserProfile(token, username),
            getRoleCode(token)
        ]);

        const batchSystemToken = await getBatchSystemClientCredentialsTokens(username);

        return {profile, role, token, batchSystemToken};
    }

    async function getPasswordTokens(username, password) {
        const oauthClientToken = generateOauthClientToken();
        const oauthRequest = {grant_type: 'password', username, password};

        return oauthTokenRequest(oauthClientToken, oauthRequest);
    }

    async function getBatchSystemClientCredentialsTokens(username) {
        const oauthAdminClientToken = generateBatchSystemOauthClientToken();
        const oauthRequest = {grant_type: 'client_credentials', username};

        return oauthTokenRequest(oauthAdminClientToken, oauthRequest);
    }

}

async function oauthTokenRequest(clientToken, oauthRequest) {
    const oauthResult = await getOauthToken(clientToken, oauthRequest);
    logger.info(`Oauth request for grant type '${oauthRequest.grant_type}', result status: ${oauthResult.status}`);

    return parseOauthTokens(oauthResult);
}

function gatewayTokenOrCopy(token) {
    return config.nomis.apiGatewayEnabled === 'yes' ? generateApiGatewayToken() : token;
}

function getOauthToken(oauthClientToken, requestSpec) {

    const oauthRequest = querystring.stringify(requestSpec);

    return superagent
        .post(`${getOauthUrl()}/oauth/token`)
        .set('Authorization', gatewayTokenOrCopy(oauthClientToken))
        .set('Elite-Authorization', oauthClientToken)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(oauthRequest)
        .timeout(timeoutSpec);
}

function parseOauthTokens(oauthResult) {

    const token = `${oauthResult.body.token_type} ${oauthResult.body.access_token}`;
    const refreshToken = oauthResult.body.refresh_token;

    return {token, refreshToken};
}

async function getUserProfile(token, username) {
    const profileResult = await nomisGet('/users/me', token);
    logger.info(`Elite2 profile success for [${username}]`);
    return profileResult.body;
}

async function getRoleCode(token) {
    const roleCode = await getRoleWithCode(token, config.nomis.batchUserRole);

    if (roleCode) {
        logger.info(`Elite2 got batch user role code [${roleCode}]`);
        return roleCode;
    }

    logger.info(`Elite2 user does not have role [${config.nomis.batchUserRole}]`);
    throw new Error('Login error - no acceptable batch user role');
}

async function getRoleWithCode(token, roleCode) {

    const rolesResult = await nomisGet('/users/me/roles', token);
    const roles = rolesResult.body;
    logger.info(`Roles response [${JSON.stringify(roles)}]`);

    if (!roles) {
        return null;
    }

    return roles.find(role => role.roleCode === roleCode);
}

function nomisGet(path, token) {
    return superagent
        .get(`${config.nomis.apiUrl}${path}`)
        .set('Authorization', gatewayTokenOrCopy(token))
        .set('Elite-Authorization', token)
        .timeout(timeoutSpec);
}

function getOauthUrl() {
    return config.nomis.apiUrl.replace('elite2api/api', 'auth');
}

function unauthorised(error) {
    return [400, 401, 403].includes(error.status);
}

module.exports = function createSignInService(tokenStore) {
    return signInService(tokenStore);
};
